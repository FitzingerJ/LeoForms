import { Component, OnInit, ViewChild } from '@angular/core';
import {
  DiagramComponent,
  NodeModel,
  ConnectorModel,
  SymbolPaletteComponent,
  DiagramTools,
  PointPortModel,
  SymbolInfo
} from '@syncfusion/ej2-angular-diagrams';

@Component({
  selector: 'app-workflow-editor',
  templateUrl: './workflow-editor.component.html',
  styleUrls: ['./workflow-editor.component.css']
})
export class WorkflowEditorComponent implements OnInit {
  @ViewChild('diagram') diagramComponent!: DiagramComponent;
  @ViewChild('symbolPalette') symbolPaletteComponent!: SymbolPaletteComponent;

  public nodes: NodeModel[] = [];
  public connectors: ConnectorModel[] = [];
  public palettes: any[] = [];
  public symbolMargin = { left: 15, right: 15, top: 15, bottom: 15 };
  public tool: DiagramTools = DiagramTools.Default;
  public isConnectionMode = false;

  private firstNodeId: string | null = null;

  ngOnInit(): void {
    this.palettes = [
      {
        id: 'nodes',
        expanded: true,
        symbols: this.getSymbols(),
        title: 'Bausteine'
      }
    ];
  }

  public getSymbols(): NodeModel[] {
    const commonPorts: PointPortModel[] = [
      { id: 'top', offset: { x: 0.5, y: 0 }, visibility: 1, shape: 'Circle' },
      { id: 'bottom', offset: { x: 0.5, y: 1 }, visibility: 1, shape: 'Circle' },
      { id: 'left', offset: { x: 0, y: 0.5 }, visibility: 1, shape: 'Circle' },
      { id: 'right', offset: { x: 1, y: 0.5 }, visibility: 1, shape: 'Circle' }
    ];

    return [
      {
        id: 'Start',
        shape: { type: 'Flow', shape: 'Terminator' },
        style: { fill: '#357BD2', strokeColor: 'white' },
        annotations: [{ content: 'Start' }],
        width: 80,
        height: 40,
        ports: commonPorts
      },
      {
        id: 'Formular',
        shape: { type: 'Flow', shape: 'Process' },
        style: { fill: '#28A745', strokeColor: 'white' },
        annotations: [{ content: 'Formular' }],
        width: 100,
        height: 50,
        ports: commonPorts
      },
      {
        id: 'Verzweigung',
        shape: { type: 'Flow', shape: 'Decision' },
        style: { fill: '#FFC107', strokeColor: 'white' },
        annotations: [{ content: 'Verzweigung' }],
        width: 80,
        height: 80,
        ports: commonPorts
      },
      {
        id: 'Rücksprung',
        shape: { type: 'Flow', shape: 'Document' },
        style: { fill: '#6F42C1', strokeColor: 'white' },
        annotations: [{ content: 'Rücksprung' }],
        width: 100,
        height: 50,
        ports: commonPorts
      },
      {
        id: 'Ende',
        shape: { type: 'Flow', shape: 'Terminator' },
        style: { fill: '#DC3545', strokeColor: 'white' },
        annotations: [{ content: 'Ende' }],
        width: 80,
        height: 40,
        ports: commonPorts
      }
    ];
  }

  public getSymbolInfo(symbol: NodeModel): SymbolInfo {
    return { fit: true };
  }

  public getSymbolDefaults(symbol: NodeModel): void {
    symbol.style = { strokeColor: '#757575' };
  }

  public activateConnectorClickMode(): void {
    this.tool = DiagramTools.None;
    this.firstNodeId = null;
    this.isConnectionMode = true;
  }

  public onDiagramClick(args: any): void {
    if (!this.isConnectionMode) return;

    const element = args?.actualObject;
    if (!element?.id || !(element as any).offsetX) return;

    if (!this.firstNodeId) {
      this.firstNodeId = element.id;
    } else {
      const newConnector: ConnectorModel = {
        id: `connector_${this.firstNodeId}_${element.id}_${Date.now()}`,
        sourceID: this.firstNodeId,
        targetID: element.id,
        type: 'Straight'
      };
      this.diagramComponent.add(newConnector);
      this.firstNodeId = null;
      this.isConnectionMode = false;
    }
  }

  // Speichern als JSON-Datei
  public saveDiagram(): void {
    const data = this.diagramComponent.saveDiagram();
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leoforms-workflow.json';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Laden aus JSON-Datei
  public loadDiagram(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const json = e.target?.result as string;
        this.diagramComponent.loadDiagram(json);
      };
      reader.readAsText(file);
    };

    input.click();
  }
}