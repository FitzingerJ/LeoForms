import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-document-course',
  templateUrl: './document-course.component.html',
  styleUrls: ['./document-course.component.css']
})
export class DocumentCourseComponent {
  firstFormGroup: FormGroup;
  secondFormGroup: FormGroup;
  thirdFormGroup: FormGroup;  
  fourthFormGroup: FormGroup; 
  isUserAuthorized: boolean = true; // Dynamisch basierend auf Benutzerberechtigung
  selectedFileName: string = "";
  documentName : string = "TestDokument";

  constructor(private _formBuilder: FormBuilder) {
    this.firstFormGroup = this._formBuilder.group({
      fileUpload1: [null, Validators.required] // Nur erforderlich, keine weiteren Einschränkungen
    });
    this.secondFormGroup = this._formBuilder.group({
      fileUpload2: [null, Validators.required] // Nur erforderlich, keine weiteren Einschränkungen
    });
    this.thirdFormGroup = this._formBuilder.group({
      fileUpload3: [null, Validators.required] // Nur erforderlich, keine weiteren Einschränkungen
    });
    this.fourthFormGroup = this._formBuilder.group({
      fileUpload4: [null, Validators.required] // Nur erforderlich, keine weiteren Einschränkungen
    });
  }

  onFileUpload(file: any, formGroup: FormGroup, controlName: string) {
    if (file) {
      const control = formGroup.get(controlName);
      if (control) {
        control.setValue(file);
        control.updateValueAndValidity();
  
        this.selectedFileName = file.name;
  
        console.log(formGroup.value); 
        console.log(formGroup.valid); 
        console.log(file)
  
        // Markiere nur das aktuelle Formular als "berührt"
        formGroup.markAsTouched();
        
        Object.keys(formGroup.controls).forEach(key => {
          const ctrl = formGroup.get(key);
          if (ctrl) {
            console.log(key, ctrl.errors);
          }
        });
      }
    }
  }
  
  

  onFileSelected(fileInput: any, formGroup: FormGroup, controlName: string) {

    const file = fileInput.files[0];
  
    if (file) {
      this.onFileUpload(file, formGroup, controlName);
    }
  }

  canEditStep(stepIndex: number): boolean {
    // Logik zur Überprüfung der Berechtigung des Benutzers
    //return this.isUserAuthorized;
    return this.isUserAuthorized;
  }
}
