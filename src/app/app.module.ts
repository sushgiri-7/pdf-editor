import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PdfEditorComponent } from './pdf-editor/pdf-editor.component';

// Import PrimeNG modules
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [AppComponent, PdfEditorComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FileUploadModule, // For p-fileUpload
    ButtonModule, // For p-button
    DialogModule, // For p-dialog
    InputTextModule, // For p-inputText
    FormsModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
