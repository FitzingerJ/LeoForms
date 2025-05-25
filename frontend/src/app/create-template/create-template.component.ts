import { Component, OnInit } from '@angular/core';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MarkdownService } from 'ngx-markdown';
import { Title } from '@angular/platform-browser';
import { DataService } from '../data.service';
import { Router } from '@angular/router';
import templateData from 'src/assets/formular_templates_corrected.json';

@Component({
  selector: 'app-create-template',
  templateUrl: './create-template.component.html',
  styleUrls: [ './create-template.component.css' ]
})
export class CreateTemplateComponent implements OnInit {


  // CHIPS FIELDS
  separatorKeysCodes: number[] = [ ENTER, COMMA ];
  evaluateFields: string[] = [];
  formName: any;
  formDesc: any;
  // @ts-ignore
  dataSource: GroupInterface[];

  title = 'LeoFormsfe';
  dropdown = '';
  markdown = ``;

  constructor(private markdownService: MarkdownService, private titleService: Title, private data: DataService, private route: Router) {
    this.titleService.setTitle('Create Template');

  }

  ngOnInit(): void {
    this.workflowTemplates = templateData;
    let dropdownId = "";
    this.markdownService.renderer.listitem = function (text) {
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

    this.markdownService.renderer.table = function (header, body) {
      // Spezialfall: Dropdown-Markierung vorhanden → Dropdown rendern
      if (header.includes('[DROPDOWN]')) {
        const cleanHeader = header.replace('[DROPDOWN]', '').trim();
        const newBody = body.replace(/<td>/gi, '<option>').replace(/<\/td>/gi, '</option>');
        return '<select name="' + cleanHeader + '" id="dropdown-menu">\n'
          + '<option disabled selected hidden>' + cleanHeader + ' wählen...</option>\n'
          + newBody
          + '</select>\n';
      }

      // Normale Markdown-Tabelle → als HTML-Tabelle rendern
      return '<table class="markdown-table"><thead>' + header + '</thead><tbody>' + body + '</tbody></table>';
    };

  }

  workflowTemplates: any[] = [];

  selectTemplate(template: any) {
    this.markdown = template.markdown;
  }




  sendForm() {
    // @ts-ignore
    this.data.saveMd(this.formName, this.markdown, this.formDesc, this.dropdown);

    this.markdown = '';
    this.formName = '';
    this.formDesc = '';
    console.log(this.dropdown);

    //this.route.navigate([ '/template_inv' ]);


  }


}
