import {
  Component,
  ElementRef,
  ViewChild,
  ViewChildren,
  QueryList,
  OnInit,
} from '@angular/core';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import interact from 'interactjs';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

@Component({
  selector: 'app-pdf-editor',
  templateUrl: './pdf-editor.component.html',
  styleUrls: ['./pdf-editor.component.css'],
})
export class PdfEditorComponent implements OnInit {
  pdfFile: File | null = null;
  pdfPages: HTMLCanvasElement[] = [];

  @ViewChildren('canvasRefs') canvasRefs!: QueryList<
    ElementRef<HTMLCanvasElement>
  >;
  @ViewChild('pdfContainer', { static: false }) pdfContainer!: ElementRef;

  textItems: {
    id: number;
    pageIndex: number;
    x: number;
    y: number;
    text: string;
  }[] = [];
  imageItems: {
    id: number;
    pageIndex: number;
    x: number;
    y: number;
    src: string;
    width: number;
    height: number;
  }[] = [];

  checkboxItems: {
    id: number;
    pageIndex: number;
    x: number;
    y: number;
    checked: boolean;
  }[] = [];

  checkboxCounter = 0;

  textCounter = 0;
  imageCounter = 0;

  ngOnInit(): void {
    this.loadDocument();
  }

  // save data in localStorage

  saveDocument(): void {
    if (!this.pdfFile) {
      alert('No PDF file uploaded!');
      return;
    }

    const fileReader = new FileReader();
    fileReader.onload = () => {
      const documentData = {
        pdfFile: fileReader.result as string, // Save PDF file as a base64 string
        pdfPages: this.pdfPages.map((canvas) => canvas.toDataURL()), // Save PDF pages as images
        textItems: this.textItems,
        imageItems: this.imageItems,
        checkboxItems: this.checkboxItems,
        textCounter: this.textCounter, // Save textCounter
        imageCounter: this.imageCounter, // Save imageCounter
        checkboxCounter: this.checkboxCounter, // Save checkboxCounter
      };
      localStorage.setItem('savedDocument', JSON.stringify(documentData));
      alert('Document saved successfully!');
    };
    fileReader.readAsDataURL(this.pdfFile); // Read the file as a base64 string
  }

  // loadDocument

  async loadDocument(): Promise<void> {
    const savedDocument = localStorage.getItem('savedDocument');
    if (savedDocument) {
      const documentData = JSON.parse(savedDocument);

      // Restore counters from saved data
      this.textCounter = documentData.textCounter || 0;
      this.imageCounter = documentData.imageCounter || 0;
      this.checkboxCounter = documentData.checkboxCounter || 0;

      // Load PDF file
      if (documentData.pdfFile) {
        const base64Data = documentData.pdfFile.split(',')[1]; // Extract base64 data
        const byteCharacters = atob(base64Data); // Decode base64
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        this.pdfFile = new File([blob], 'saved.pdf', {
          type: 'application/pdf',
        });
        await this.convertPdfToImages(this.pdfFile);
      }

      // Load PDF pages
      this.pdfPages = documentData.pdfPages.map((dataUrl: string) => {
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.src = dataUrl;
        canvas.width = img.width;
        canvas.height = img.height;
        const context = canvas.getContext('2d');
        if (context) {
          context.drawImage(img, 0, 0);
        }
        return canvas;
      });

      // Load text items
      this.textItems = documentData.textItems;
      this.textItems.forEach((item: any) =>
        this.createDraggableElement(item, 'text')
      );

      // Load image items
      this.imageItems = documentData.imageItems;
      this.imageItems.forEach((item: any) =>
        this.createDraggableElement(item, 'image')
      );

      // Load checkbox items
      this.checkboxItems = documentData.checkboxItems;
      this.checkboxItems.forEach((item: any) =>
        this.createDraggableElement(item, 'checkbox')
      );

      setTimeout(() => this.renderCanvases(), 500);
    } else {
      alert('No saved document found!');
    }
  }

  async onFileChange(event: any): Promise<void> {
    this.pdfFile = event.files[0];
    if (this.pdfFile) {
      await this.convertPdfToImages(this.pdfFile);
    }
  }

  async convertPdfToImages(file: File): Promise<void> {
    const fileReader = new FileReader();
    fileReader.onload = async () => {
      const pdfData = new Uint8Array(fileReader.result as ArrayBuffer);
      const pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const numPages = pdfDoc.numPages;

      this.pdfPages = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (context) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          this.pdfPages.push(canvas);
        }
      }

      setTimeout(() => this.renderCanvases(), 500);
    };

    fileReader.readAsArrayBuffer(file);
  }

  renderCanvases(): void {
    this.canvasRefs.forEach((canvasRef, index) => {
      const canvasElement = canvasRef.nativeElement;
      const context = canvasElement.getContext('2d');
      if (context) {
        canvasElement.width = this.pdfPages[index].width;
        canvasElement.height = this.pdfPages[index].height;
        context.drawImage(this.pdfPages[index], 0, 0);
      }
    });
  }

  // addTextToPage(): void {
  //   const textItem = {
  //     id: this.textCounter++,
  //     pageIndex: 0,
  //     x: 50,
  //     y: 50,
  //     text: 'New Text',
  //   };
  //   this.textItems.push(textItem);
  //   this.createDraggableElement(textItem, 'text');
  // }

  addTextToPage(): void {
    const textItem = {
      id: this.textCounter++, // Increment textCounter
      pageIndex: 0,
      x: 50,
      y: 50 + this.textItems.length * 20, // Adjust Y position to avoid overlap
      text: 'New Text',
    };
    this.textItems.push(textItem);
    this.createDraggableElement(textItem, 'text');
  }

  addImageToPage(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const imageItem = {
        id: this.imageCounter++, // Increment imageCounter
        pageIndex: 0,
        x: 100,
        y: 100 + this.imageItems.length * 120, // Adjust Y position to avoid overlap
        src: reader.result as string,
        width: 100,
        height: 100,
      };
      this.imageItems.push(imageItem);
      this.createDraggableElement(imageItem, 'image');
    };
    reader.readAsDataURL(file);
  }

  addCheckboxToPage(): void {
    const checkboxItem = {
      id: this.checkboxCounter++, // Increment checkboxCounter
      pageIndex: 0,
      x: 50,
      y: 50 + this.checkboxItems.length * 20, // Adjust Y position to avoid overlap
      checked: false,
    };
    this.checkboxItems.push(checkboxItem);
    this.createDraggableElement(checkboxItem, 'checkbox');
  }

  createDraggableElement(item: any, type: 'text' | 'image' | 'checkbox'): void {
    const container = this.pdfContainer.nativeElement;
    const element = document.createElement('div');

    element.id = `${type}-${item.id}`;
    element.style.position = 'absolute';
    element.style.left = `${item.x}px`;
    element.style.top = `${item.y}px`;

    if (type === 'text') {
      element.innerText = item.text;
      element.classList.add('draggable-text');
      element.setAttribute('contenteditable', 'true');
      element.addEventListener('blur', () =>
        this.updateText(item.id, element.innerText)
      );
    } else if (type === 'image') {
      const img = document.createElement('img');
      img.src = item.src;
      img.width = item.width;
      img.height = item.height;
      img.style.pointerEvents = 'none';
      element.appendChild(img);
    } else if (type === 'checkbox') {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = item.checked;
      checkbox.addEventListener('change', () => {
        item.checked = checkbox.checked;
      });
      element.appendChild(checkbox);
    }

    container.appendChild(element);

    interact(element).draggable({
      listeners: {
        move: (event) => {
          item.x += event.dx;
          item.y += event.dy;
          event.target.style.left = `${item.x}px`;
          event.target.style.top = `${item.y}px`;
        },
      },
    });
  }

  updateText(textId: number, newText: string): void {
    const textItem = this.textItems.find((item) => item.id === textId);
    if (textItem) {
      textItem.text = newText;
    }
  }

  downloadPdf(): void {
    const doc = new jsPDF();

    this.canvasRefs.forEach((canvasRef, index) => {
      const canvas = canvasRef.nativeElement;
      const imgData = canvas.toDataURL('image/png');

      if (index > 0) {
        doc.addPage();
      }
      doc.addImage(
        imgData,
        'PNG',
        0,
        0,
        210,
        (canvas.height / canvas.width) * 210
      );

      const scaleX = 210 / canvas.width;
      const scaleY = ((canvas.height / canvas.width) * 210) / canvas.height;

      this.checkboxItems
        .filter((checkbox) => checkbox.pageIndex === index)
        .forEach((checkbox) => {
          doc.setFillColor(255, 255, 255);
          doc.rect(
            checkbox.x * scaleX,
            checkbox.y * scaleY,
            5,
            5,
            checkbox.checked ? 'F' : 'S'
          );
        });

      this.textItems
        .filter((text) => text.pageIndex === index)
        .forEach((text) => {
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
          doc.text(text.text, text.x * scaleX, text.y * scaleY);
        });

      this.imageItems
        .filter((img) => img.pageIndex === index)
        .forEach((img) => {
          doc.addImage(
            img.src,
            'PNG',
            img.x * scaleX,
            img.y * scaleY,
            img.width * scaleX,
            img.height * scaleY
          );
        });
    });

    doc.save('edited_pdf.pdf');
  }
}
