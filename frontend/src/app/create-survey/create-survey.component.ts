import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { TemplateModel } from '../model/template.model';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { FormControl } from '@angular/forms';
import { Observable, startWith } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService, GroupInterface, ReducedNode } from '../data.service';
import { MatRadioModule } from '@angular/material/radio';
import { marked } from 'marked';
import { AfterViewInit } from '@angular/core';
import { MockOidcSecurityService as OidcSecurityService } from '../auth/mock-oidc.service';
import { HttpClient } from '@angular/common/http';
import { SurveyDTO } from '../data.service';

import { MarkdownService } from 'ngx-markdown';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-create-survey',
  templateUrl: './create-survey.component.html',
  styleUrls: [ './create-survey.component.css' ]
})
export class CreateSurveyComponent implements OnInit, AfterViewInit {

  workflow: ReducedNode[] = [];
  separatorKeysCodes: number[] = [ ENTER, COMMA ];
  groupControl = new FormControl();
  filteredGroups: Observable<string[]>;
  groups: string[] = [];
  evaluateFields: string[] = [];
  allGroups: string[] = [];
  dataSource: GroupInterface[] | undefined;
  // @ts-ignore
  @ViewChild('fruitInput') fruitInput: ElementRef<HTMLInputElement>;
  todayDate: Date = new Date();
  templateId: any;
  singleTemplate: TemplateModel | undefined;
  form = '';
  formName: any;
  markdown: any;
  formDesc: any;
  endDate?: Date;
  renderedHtml: string = '';
  editedFormHtml: string = '';
  customRenderer: marked.Renderer = new marked.Renderer();
  editMode: boolean = false;
  hasExistingWorkflowType: boolean = false;
  useWorkflowModel: boolean = false;

  constructor(public router: ActivatedRoute,
              public dataServ: DataService,
              private markdownService: MarkdownService,
              private route: Router,
              public oidcSecurityService: OidcSecurityService,
              private http: HttpClient) {

    this.filteredGroups = this.groupControl.valueChanges.pipe(
      startWith(null),
      map((group: string | null) => (group ? this._filter(group) : this.allGroups.slice()))
    );

    this.dataSource = this.dataServ.groups;

    this.dataServ.getGroups().subscribe((value: any) => {
      this.dataSource = value;
      this.dataServ.groups = value;
      // @ts-ignore
      let i = 0;
      this.dataSource?.forEach(item => {
        // @ts-ignore
        this.allGroups.push(this.dataSource[i].name);
        i++;
      });

    });

  }

  onFormEdit(event: Event): void {
    const target = event.target as HTMLElement;
    this.editedFormHtml = target.innerHTML;
  }

  ngAfterViewInit(): void {
    const variableBinding = document.querySelector('.variable-binding') as HTMLElement;

    // Nur initial einmal setzen
    if (variableBinding && this.editedFormHtml) {
      variableBinding.innerHTML = this.editedFormHtml;
    } else if (variableBinding && this.renderedHtml) {
      variableBinding.innerHTML = this.renderedHtml;
    }

    console.log('editMode:', this.editMode);
    console.log('hasExistingWorkflowType:', this.hasExistingWorkflowType);
    console.log('useWorkflowModel:', this.useWorkflowModel);
  }

  ngOnInit(): void {
    this.templateId = this.router.snapshot.params['id'];
    this.editMode = this.router.snapshot.queryParams['editMode'] === 'true';
    if (this.editMode && this.templateId) {
      const name = localStorage.getItem('templateName-' + this.templateId);
      if (name) {
        this.singleTemplate = { name } as TemplateModel;
      }
    }

    if (this.editMode) {
      const wfRaw = localStorage.getItem('workflow-' + this.templateId);
      const groupRaw = localStorage.getItem('groups-' + this.templateId);

      if (wfRaw) {
        this.workflow = JSON.parse(wfRaw);
        if (this.workflow.length > 0) {
          this.hasExistingWorkflowType = true;
          this.useWorkflowModel = true;
          this._useWorkflow = true;
        }
      }

      if (groupRaw) {
        this.groups = JSON.parse(groupRaw);
        if (this.groups.length > 0) {
          this.hasExistingWorkflowType = true;
          this.useWorkflowModel = false;
          this._useWorkflow = false;
        }
      }
    }
    
    const templateName = localStorage.getItem('templateName-' + this.templateId);
    if (templateName) {
      this.singleTemplate = { name: templateName } as TemplateModel;
    }
    const renderer = new marked.Renderer();

    // 🧠 Schritt 0: Draft einmal sauber laden (ganz am Anfang in ngOnInit)
    // ⛔️ WENN gesetzt → RESTLICHEN Code abbrechen → Draft hat Vorrang
    const draft = this.dataServ.getSurveyDraft();
    if (draft && draft.currentHtml) {
      this.formName = draft.formName;
      this.formDesc = draft.formDesc;
      this.markdown = draft.markdown;
      this.groups = draft.groups;
      this.endDate = draft.endDate ? new Date(draft.endDate) : undefined;
      this.useWorkflow = draft.useWorkflow;
      this.templateId = draft.templateId;
      this.editedFormHtml = draft.currentHtml;

      const storedName = localStorage.getItem('templateName-' + this.templateId);
      if (storedName) {
        this.singleTemplate = { name: storedName } as TemplateModel;
      }

      setTimeout(() => {
        const el = document.querySelector('.variable-binding') as HTMLElement;
        if (el) el.innerHTML = this.editedFormHtml;
        setTimeout(() => this.restoreDomValues(), 0);
      }, 0);

      return; // ⛔️ NICHTS anderes ausführen danach
    }

    // 🟦 Schritt 1: LocalStorage laden, wenn Draft nicht da war
    if (this.templateId) {
      const html = localStorage.getItem('formHtml-' + this.templateId);
      const formName = localStorage.getItem('formName-' + this.templateId);
      const formDesc = localStorage.getItem('formDesc-' + this.templateId);

      if (html && formName && formDesc) {
        this.editedFormHtml = html;
        this.formName = formName;
        this.formDesc = formDesc;

        const wfRaw = localStorage.getItem('workflow-' + this.templateId);
        if (wfRaw) {
          this.workflow = JSON.parse(wfRaw);
          if (this.workflow.length > 0) this.useWorkflow = true;
        }

        const groupRaw = localStorage.getItem('groups-' + this.templateId);
        if (groupRaw) {
          this.groups = JSON.parse(groupRaw);
          if (this.groups.length > 0) this.useWorkflow = false;
        }

        this.endDate = localStorage.getItem('endDate-' + this.templateId)
          ? new Date(localStorage.getItem('endDate-' + this.templateId)!)
          : this.endDate;

        setTimeout(() => {
          const el = document.querySelector('.variable-binding') as HTMLElement;
          if (el) el.innerHTML = this.editedFormHtml;
          setTimeout(() => this.restoreDomValues(), 0);
        }, 0);

        // 🧠 Draft updaten (optional), aber keine weiteren Daten mehr überschreiben
        this.dataServ.setSurveyDraft({
          formName: this.formName,
          formDesc: this.formDesc,
          markdown: this.markdown,
          groups: this.groups,
          endDate: this.endDate,
          useWorkflow: this.useWorkflow,
          templateId: this.templateId,
          currentHtml: this.editedFormHtml
        });

        return; // NICHT weitergehen
      }
    }

    // 🟩 Schritt 2: Template komplett neu laden, wenn Draft + LocalStorage leer waren
    this.dataServ.getTemplateById(this.templateId).subscribe(template => {
      this.singleTemplate = template;
      this.markdown = template.markdown;
      this.formName = template.name;
      this.formDesc = template.description;

      const existingName = localStorage.getItem('templateName-' + this.templateId);
      if (!existingName) {
        localStorage.setItem('templateName-' + this.templateId, template.name ?? 'Unbenanntes Template');
      }

      this.formName = template.name;

      marked.use({ renderer: this.customRenderer });
      const rawHtml = marked(this.markdown || '');
      const htmlContainer = document.createElement('div');
      htmlContainer.innerHTML = rawHtml;

      htmlContainer.querySelectorAll('input[type="text"]').forEach(input => {
        (input as HTMLInputElement).disabled = false;
      });

      this.renderedHtml = htmlContainer.innerHTML;
      this.editedFormHtml = this.renderedHtml;

      setTimeout(() => {
        const el = document.querySelector('.variable-binding') as HTMLElement;
        if (el) el.innerHTML = this.editedFormHtml;
        setTimeout(() => this.restoreDomValues(), 0);
      }, 0);
    });


    console.log(this.markdown);

    this.workflow = this.dataServ.getWorkflow();
    console.log('Geladener Workflow:', this.workflow);

    if (this.templateId) {
      const html = localStorage.getItem('formHtml-' + this.templateId);
      const formName = localStorage.getItem('formName-' + this.templateId);
      const formDesc = localStorage.getItem('formDesc-' + this.templateId);

      // ✅ Wichtig: Nur wenn alle Werte vorhanden sind, verwende sie und überspringe alles weitere!
      if (html && formName && formDesc) {
        this.editedFormHtml = html;
        this.formName = formName;
        this.formDesc = formDesc;

        const wfRaw = localStorage.getItem('workflow-' + this.templateId);
        if (wfRaw) {
          this.workflow = JSON.parse(wfRaw);
          if (this.workflow.length > 0) this.useWorkflow = true;
        }

        const groupRaw = localStorage.getItem('groups-' + this.templateId);
        if (groupRaw) {
          this.groups = JSON.parse(groupRaw);
          if (this.groups.length > 0) this.useWorkflow = false;
        }

        this.endDate = localStorage.getItem('endDate-' + this.templateId)
          ? new Date(localStorage.getItem('endDate-' + this.templateId)!)
          : this.endDate;

        setTimeout(() => {
          const el = document.querySelector('.variable-binding') as HTMLElement;
          if (el) el.innerHTML = this.editedFormHtml;
          setTimeout(() => this.restoreDomValues(), 0);
        }, 0);

        if (this.editMode) {
            if (this.groups.length > 0) {
              this.useWorkflow = false;
              this.hasExistingWorkflowType = true;
            }

            if (this.workflow.length > 0) {
              this.useWorkflow = true;
              this.hasExistingWorkflowType = true;
            }
          }

        // 🧠 Draft aktualisieren, aber NICHT überschreiben
        this.dataServ.setSurveyDraft({
          formName: this.formName,
          formDesc: this.formDesc,
          markdown: this.markdown,
          groups: this.groups,
          endDate: this.endDate,
          useWorkflow: this.useWorkflow,
          templateId: this.templateId,
          currentHtml: this.editedFormHtml
        });

        return;
      }
    }
    let dropdownId = "";
    renderer.listitem = function (text) {
      let fieldName;
      if (/\[x\]\s*/.test(text)) {
        console.log(text);
        fieldName = text.substring(3, text.length);
        text = text
          .replace(/\[x\]\s*/, '<input type="checkbox" class="boxerl" style="list-style: none" ' +
            //'checked="false" ' +
            'name="' +
            fieldName + '" ' +
            '> ');
        return '<li style="list-style: none">' + text + '</li>';
      }
      if (/\[r:.{1,}\]\s/gi.test(text)) {
        console.log(text)
        var name = text.substring(
          text.indexOf(':') + 1,
          text.lastIndexOf(']')
        );
        text = text
          .replace(/\[r:.{1,}\]\s/gi, '<input type="radio" name="' + name + '" value="' + text.substring(9) + '" id="hide-dropdown" class="radio-btn"> ');
        return '<li style="list-style: none">' + text + '</li>';
      }
      if (/\[rd:.*?;.{1,}\]\s/gi.test(text)) {
        console.log(text)
        var name = text.substring(
          text.indexOf(':') + 1,
          text.lastIndexOf(';')
        );
        var dd = text.substring(
          text.indexOf(';') + 1,
          text.lastIndexOf(']')
        );
        console.log(name)
        console.log(dd);
        dropdownId = dd;
        console.log(text.substring(text.lastIndexOf(']') + 2));
        text = text
          .replace(/\[rd:.*?;.{1,}\]\s/gi, '<input type="radio" name="' + name + '" value="' + text.substring(text.lastIndexOf(']') + 2) + '" id="show-dropdown" class="radio-btn"> ');
        return '<li style="list-style: none">' + text + '</li>';
      }
      if (/^\s*\[[d ]\]\s*/.test(text)) {
        text = text
          .replace(/^\s*\[[d ]\]\s*/, '<option> ' + text + '</option>>');
        return '<select>' + text + '</select>';
      }
      if (/\[t:.{1,}\]/gi.test(text)) {
        var name = text.substring(
          text.indexOf(':') + 1,
          text.lastIndexOf(']')
        );
        text = text
          .replace(/\[t:.{1,}\]/gi, '<input type="text" name="' + name + '"> ');
        return '<li style="list-style: none">' + text + '</li>';
      } else {
        return '<li>' + text + '</li>';
      }
    };

    renderer.table = function (header: string, body: string) {
      // Spezialfall Dropdown
      if (header.includes('[DROPDOWN]')) {
        const cleanHeader = header.replace('[DROPDOWN]', '').trim();
        const newBody = body.replace(/<td>/gi, '<option>').replace(/<\/td>/gi, '</option>');
        return `
          <select name="${cleanHeader}" id="dropdown-menu">
            <option disabled selected hidden>${cleanHeader} wählen...</option>
            ${newBody}
          </select>`;
      }

      // Editierbare Tabelle: alle <td> → input-Feld
      const editableBody = body.replace(/<td>(.*?)<\/td>/gi, `<td><input type="text" value="$1" style="width: 100%; border: none; outline: none; background: transparent;" /></td>`);

      return `
        <table class="markdown-table">
          ${header}
          ${editableBody}
        </table>
      `;
    };

    marked.use({ renderer });

    if (!this.editedFormHtml && this.renderedHtml) {
      this.editedFormHtml = this.renderedHtml;
    }

    if (!this.editedFormHtml && this.renderedHtml) {
      this.editedFormHtml = this.renderedHtml;
    }

    if (!this.singleTemplate && this.templateId) {
      const storedName = localStorage.getItem('templateName-' + this.templateId);
      if (storedName) {
        this.singleTemplate = { name: storedName } as TemplateModel;
      }
    }
  }

  onWorkflowTypeChange(value: boolean) {
    if (this.editMode && this.hasExistingWorkflowType) return;

    this.useWorkflowModel = value;
    this._useWorkflow = value; // interne Logik
  }

  restoreDomValues(): void {
    const container = document.querySelector('.variable-binding') as HTMLElement;
    if (!container) return;

    // ✅ Inputs zurücksetzen
    container.querySelectorAll('input').forEach((input: HTMLInputElement) => {
      const val = input.getAttribute('value');
      if (val !== null) input.value = val;

      const isChecked = input.getAttribute('checked');
      if (isChecked !== null) input.checked = true;
    });

    // ✅ Dropdowns
    container.querySelectorAll('select').forEach((select: HTMLSelectElement) => {
      const selected = select.querySelector('option[selected]') as HTMLOptionElement | null;
      if (selected) selected.selected = true;
    });

    // ✅ Textareas
    container.querySelectorAll('textarea').forEach((textarea: HTMLTextAreaElement) => {
      textarea.value = textarea.innerHTML;
    });
  }

  saveSurvey() {
    this.workflow = this.dataServ.getWorkflow(); // 💥 Hole die aktuellste Version
    // 🧠 Stelle sicher, dass der letzte Fokuswechsel abgeschlossen ist
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      activeElement.blur();
    }

    const variableBinding = document.querySelector('.variable-binding') as HTMLElement;
    if (!variableBinding) return;

    // 🧽 DOM klonen und Input-Werte eintragen
    const cloned = variableBinding.cloneNode(true) as HTMLElement;

    cloned.querySelectorAll('input').forEach((input: HTMLInputElement) => {
      if (input.type === 'text') {
        input.setAttribute('value', input.value);
      } else if (input.type === 'checkbox' || input.type === 'radio') {
        if (input.checked) {
          input.setAttribute('checked', 'true');
        } else {
          input.removeAttribute('checked');
        }
      }
    });

    cloned.querySelectorAll('select').forEach((select: HTMLSelectElement) => {
      const selected = select.querySelector('option:checked');
      if (selected) {
        select.querySelectorAll('option').forEach(option => option.removeAttribute('selected'));
        selected.setAttribute('selected', 'true');
      }
    });

    cloned.querySelectorAll('textarea').forEach((textarea: HTMLTextAreaElement) => {
      textarea.innerHTML = textarea.value;
    });

    // 🧾 Speichere finale HTML
    this.editedFormHtml = cloned.innerHTML;

    // 💾 Weiter wie gehabt...
    const inputElement = `<form action="#" id='daform'>${this.editedFormHtml}<button onclick="submitData()">Antworten abschicken</button></form>`;

    let finalForm = '<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>\n' +
      '<script>function submitData() {\n' +
      '    var data = $("form").serialize();\n' +
      '    console.log(data);\n' +
      '    alert(data);\n' +
      '    $.ajax({\n' +
      '        type: \'POST\',\n' +
      '        url: \'http://localhost:8080/answer\' + window.location.search,\n' +
      '        dataType: \'json\',\n' +
      '        contentType: \'application/json; charset=utf-8\',\n' +
      '        data: JSON.stringify(data),\n' +
      '        success: function (result) {\n' +
      '            console.log(\'Data received: \');\n' +
      '            console.log(result);\n' +
      '            window.location.href = "http://localhost:4200/survey_inv"\n' +
      '        }\n' +
      '    })\n' +
      '}' +
      '$(document).ready(function() {\n' +
      '    const radioBtns = $(\'.radio-btn\');\n' +
      '    const dropdownMenu = $(\'#dropdown-menu\');\n' +
      '\n' +
      '    radioBtns.on(\'click\', function() {\n' +
      '        if ($(this).val() === \'Fachtheorie\') {\n' +
      '            dropdownMenu.show();\n' +
      '        } else {\n' +
      '            dropdownMenu.hide();\n' +
      '        }\n' +
      '    });\n' +
      '});' +
      '</script>' +
      '<style>' +
      '* {\n' +
      '  font-family: "Helvetica Neue";\n' +
      '}\n' +
      '\n' +
      'form {\n' +
      '  width: 100%;\n' +
      '  max-width: 500px;\n' +
      '  margin: 50px auto;\n' +
      '  background:#fafafa;\n' +
      '  min-height: 250px;\n' +
      '  padding: 40px;\n' +
      '  border-radius: 15px;\n' +
      '}\n' +
      '\n' +
      'form input {\n' +
      '  width: 100%;\n' +
      '  height: 28px;\n' +
      '  margin-bottom: 15px;\n' +
      '}\n' +
      '#dropdown-menu {\n' +
      '  display: none;\n' +
      '}' +
      '</style>' +
      '<div id="formNameDiv"><h1 id="formName">' + this.formName + '</h1></div>' + inputElement;
    //console.log(finalForm);

    const finalHtml = this.editedFormHtml;
    const workflowJson = JSON.stringify(this.workflow);
    const step = '1';

    // @ts-ignore
    const endDateStr = this.endDate ? 
      this.endDate.toISOString().split('T')[0] : '';

    const surveyDto: SurveyDTO = {
      creationDate: new Date().toISOString().substring(0, 10),
      endDate: endDateStr,
      templateId: this.templateId,
      name: this.formName,
      description: this.formDesc,
      html: finalHtml,
      groups: this.groups
    };

    this.dataServ.saveSurvey(surveyDto).subscribe(surveyId => {
      localStorage.setItem('formHtml-' + surveyId, finalHtml);
      localStorage.setItem('workflow-' + surveyId, workflowJson);
      localStorage.setItem('step-' + surveyId, '1');
      localStorage.setItem('formName-' + surveyId, this.formName);
      localStorage.setItem('formDesc-' + surveyId, this.formDesc);
      localStorage.setItem('endDate-' + surveyId, this.endDate?.toISOString() || '');

      this.oidcSecurityService.checkAuth().subscribe(({ userData }) => {
        localStorage.setItem('creator-' + surveyId, userData.email);
      });

      this.markdown = '';
      this.formName = '';
      this.formDesc = '';

      this.route.navigate(["/survey_inv"]);
    });
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.groups.push(event.option.viewValue);
    this.fruitInput.nativeElement.value = '';
    this.groupControl.setValue(null);
  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Add our fruit
    if (value) {
      this.groups.push(value);
    }

    // Clear the input value
    event.chipInput!.clear();

    this.groupControl.setValue(null);
  }

  remove(fruit: string): void {
    const index = this.groups.indexOf(fruit);

    if (index >= 0) {
      this.groups.splice(index, 1);
    }
  }

  showDate() {
    // @ts-ignore
    //console.log(this.endDate?.getDate() + "-" + (this.endDate?.getMonth().valueOf() + 1) + "-" + this.endDate?.getFullYear());
    console.log(this.formName + ' - ' + this.formDesc);
  }

  // CHIP GROUP SELECT
  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.allGroups.filter(fruit => fruit.toLowerCase().includes(filterValue));
  }

  private _useWorkflow: boolean = false;

  get useWorkflow(): boolean {
    return this._useWorkflow;
  }

  set useWorkflow(value: boolean) {
    if (this.editMode && this.hasExistingWorkflowType) {
      // Blockiere Änderungen im Edit-Modus mit vorhandenem Verlauf
      return;
    }
    this._useWorkflow = value;
  }

  openWorkflow(): void {
    const variableBinding = document.getElementsByClassName('variable-binding').item(0) as HTMLElement;
    if (!variableBinding) return;

    // 🧽 DOM klonen
    const cloned = variableBinding.cloneNode(true) as HTMLElement;

    // 🟩 INPUT-Werte (Text, Checkbox, Radio) sichern
    cloned.querySelectorAll('input').forEach((input: HTMLInputElement) => {
      if (input.type === 'text') {
        input.setAttribute('value', input.value);
      } else if (input.type === 'checkbox' || input.type === 'radio') {
        if (input.checked) {
          input.setAttribute('checked', 'true');
        } else {
          input.removeAttribute('checked');
        }
      }
    });

    // 🟦 SELECT-Auswahl sichern
    cloned.querySelectorAll('select').forEach((select: HTMLSelectElement) => {
      const selected = select.querySelector('option:checked');
      if (selected) {
        select.querySelectorAll('option').forEach(option => option.removeAttribute('selected'));
        selected.setAttribute('selected', 'true');
      }
    });

    // 🟨 TEXTAREAS sichern (falls vorhanden)
    cloned.querySelectorAll('textarea').forEach((textarea: HTMLTextAreaElement) => {
      textarea.innerHTML = textarea.value;
    });

    // 🧾 Speichere finale HTML in Variable
    this.editedFormHtml = cloned.innerHTML;

    // 🚀 Speichern als Draft
    this.dataServ.setSurveyDraft({
      formName: this.formName,
      formDesc: this.formDesc,
      markdown: this.markdown,
      groups: this.groups,
      endDate: this.endDate,
      useWorkflow: this.useWorkflow,
      templateId: this.templateId,
      currentHtml: this.editedFormHtml
    });

    localStorage.setItem('formName-' + this.templateId, this.formName);
    localStorage.setItem('formDesc-' + this.templateId, this.formDesc);
    localStorage.setItem('endDate-' + this.templateId, this.endDate?.toISOString() || '');

    // 🔁 Navigieren zur Workflow-Seite
    this.route.navigate(['/workflow'], {
      queryParams: { templateId: this.templateId }
    });
  }
}
