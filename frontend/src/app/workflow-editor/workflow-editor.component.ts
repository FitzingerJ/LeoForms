import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit
} from '@angular/core';
import {
  NodeModel,
  ConnectorModel
} from '@syncfusion/ej2-angular-diagrams';

@Component({
  selector: 'app-workflow-editor',
  templateUrl: './workflow-editor.component.html',
  styleUrls: ['./workflow-editor.component.css']
})
export class WorkflowEditorComponent implements AfterViewInit {
  public nodes: NodeModel[] = [];
  public connectors: ConnectorModel[] = [];

  @ViewChild('diagram', { static: false }) diagramElementRef!: ElementRef;

  blockTypes = ['Start', 'Formular', 'Ende'];

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.nodes = [
        {
          id: 'Start',
          offsetX: 150,
          offsetY: 100,
          annotations: [{ content: 'Start' }]
        },
        {
          id: 'Form',
          offsetX: 350,
          offsetY: 100,
          annotations: [{ content: 'Formular' }]
        },
        {
          id: 'End',
          offsetX: 550,
          offsetY: 100,
          annotations: [{ content: 'Ende' }]
        }
      ];

      this.connectors = [
        { id: 'connector1', sourceID: 'Start', targetID: 'Form' },
        { id: 'connector2', sourceID: 'Form', targetID: 'End' }
      ];
    }, 0);
  }

  onDragStart(event: DragEvent, type: string): void {
    event.dataTransfer?.setData('type', type);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();

    const type = event.dataTransfer?.getData('type');
    if (!type) return;

    const rect = this.diagramElementRef.nativeElement.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    const id = `${type}_${Date.now()}`;
    this.nodes = [
      ...this.nodes,
      {
        id,
        offsetX,
        offsetY,
        annotations: [{ content: type }]
      }
    ];
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }
}
