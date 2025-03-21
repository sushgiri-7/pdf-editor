import {
  Component,
  ElementRef,
  ViewChild,
  ViewChildren,
  QueryList,
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
export class PdfEditorComponent {
  pdfFile: File | null = null;
  pdfPages: string[] = [];

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
  textCounter = 0;

  async onFileChange(event: any): Promise<void> {
    this.pdfFile = event.files[0];
    if (this.pdfFile) {
      this.convertPdfToImages(this.pdfFile);
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

          this.pdfPages.push(canvas.toDataURL('image/png'));
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
        const image = new Image();
        image.src = this.pdfPages[index];

        image.onload = () => {
          canvasElement.width = image.width;
          canvasElement.height = image.height;
          context.drawImage(image, 0, 0);
        };
      }
    });
  }

  addTextToPage(): void {
    const textItem = {
      id: this.textCounter++,
      pageIndex: 0,
      x: 50,
      y: 50,
      text: 'New Text',
    };
    this.textItems.push(textItem);
    this.createDraggableTextElement(textItem);
  }

  createDraggableTextElement(item: any): void {
    const container = this.pdfContainer.nativeElement;
    const textElement = document.createElement('div');

    textElement.id = `text-${item.id}`;
    textElement.innerText = item.text;
    textElement.classList.add('draggable-text');
    textElement.style.position = 'absolute';
    textElement.style.left = `${item.x}px`;
    textElement.style.top = `${item.y}px`;
    textElement.setAttribute('contenteditable', 'true');

    textElement.addEventListener('blur', () =>
      this.updateText(item.id, textElement.innerText)
    );

    container.appendChild(textElement);

    interact(textElement).draggable({
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
      ); // Maintain aspect ratio

      // Get canvas size to calculate correct scale
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      // Scaling factors from canvas pixels to PDF units
      const scaleX = 210 / canvasWidth;
      const scaleY = ((canvas.height / canvas.width) * 210) / canvasHeight;

      this.textItems
        .filter((text) => text.pageIndex === index)
        .forEach((text) => {
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);

          // Scale the text position properly
          const adjustedX = text.x * scaleX;
          const adjustedY = text.y * scaleY;

          doc.text(text.text, adjustedX, adjustedY);
        });
    });

    doc.save('edited_pdf.pdf');
  }
}
