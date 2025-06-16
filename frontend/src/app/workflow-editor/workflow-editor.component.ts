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
import { FormControl } from '@angular/forms';
import { Observable, startWith, map } from 'rxjs';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { DataService } from '../data.service';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

interface Assignment {
  name: string;
  email?: string;
  groupId?: string;
}

interface ReducedNode {
  id: string;
  label: string;
  assignedTo?: Assignment;
  next: string[];
}

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
  templateId: string = '';

  assignmentControl = new FormControl();
  filteredAssignments: Observable<string[]> = new Observable();
  availableAssignments: string[] = ['Direktor', 'Sekretariat'];
  selectedNodeForAssignment: NodeModel | null = null;

  constructor(private dataServ: DataService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.templateId = this.route.snapshot.queryParams['templateId'] || '';
    this.palettes = [
      {
        id: 'nodes',
        expanded: true,
        symbols: this.getSymbols(),
        title: 'Bausteine'
      }
    ];

    this.filteredAssignments = this.assignmentControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterAssignments(value || ''))
    );

    // Eigene Eingabe (manuell) erkennen
    this.assignmentControl.valueChanges.subscribe(value => {
      if (typeof value === 'string' && value.includes('@')) {
        this.setAssignment(value);
      }
    });
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
        id: 'Schritt',
        shape: { type: 'Flow', shape: 'Process' },
        style: { fill: '#28A745', strokeColor: 'white' },
        annotations: [{ content: 'Schritt' }],
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
        shape: { type: 'Basic', shape: 'Hexagon' },
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
    const element = args?.actualObject;

    if (!element?.id || !(element as any).offsetX) return;

    // 1. Verbindung erzeugen, wenn Verbindungsmodus aktiv
    if (this.isConnectionMode) {
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

    // 2. Immer: Node zur Zuweisung anzeigen
    const label = element?.annotations?.[0]?.content;

    if (label === 'Start' || label === 'Ende') {
      this.selectedNodeForAssignment = null;
      this.assignmentControl.setValue('');
      return;
    }

    this.selectedNodeForAssignment = element;
    const assigned = (element as any).assignedTo?.name ?? '';
    this.assignmentControl.setValue(assigned);
  }

  private _filterAssignments(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.availableAssignments.filter(option => option.toLowerCase().includes(filterValue));
  }

  onAssignmentSelected(event: MatAutocompleteSelectedEvent) {
    this.setAssignment(event.option.value);
  }

  private setAssignment(value: string): void {
    if (!this.selectedNodeForAssignment) return;
    const isEmail = value.includes('@');
    const assignment: Assignment = {
      name: value,
      ...(isEmail ? { email: value } : {})
    };
    (this.selectedNodeForAssignment as any).assignedTo = assignment;
    if (this.selectedNodeForAssignment?.annotations?.length) {
      const baseLabel = this.selectedNodeForAssignment?.annotations?.[0]?.content?.split('\n')[0] || '';
      this.selectedNodeForAssignment.annotations[0].content = `${baseLabel}\n(${assignment.name})`;
    }
  }

  public saveDiagram(): void {
    // Diagramm als Objekt (nicht nur JSON-String) speichern
    const data = JSON.parse(this.diagramComponent.saveDiagram());

    // assignedTo in jedes Node-Objekt einfügen
    for (const node of this.diagramComponent.nodes) {
      const matchingNode = data.nodes.find((n: any) => n.id === node.id);
      if (matchingNode && (node as any).assignedTo) {
        matchingNode.assignedTo = (node as any).assignedTo;
      }
    }

    // JSON erzeugen
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leoforms-workflow.json';
    a.click();
    window.URL.revokeObjectURL(url);

    // Debug-Ausgabe mit reduced Workflow
    console.log(this.getReducedWorkflow());
  }

  public getReducedWorkflow(): any[] {
    return this.diagramComponent.nodes.map((node: any) => {
      return {
        stepId: node.id,
        label: node.annotations?.[0]?.content ?? '',
        assignedTo: node.assignedTo ?? null
      };
    });
  }

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

      // ⬇ Nachladen der assignedTo-Zuweisungen (falls im JSON enthalten)
      const parsed = JSON.parse(json);
      if (parsed.nodes) {
        for (const savedNode of parsed.nodes) {
          const diagramNode = this.diagramComponent.getObject(savedNode.id) as any;
          if (diagramNode && savedNode.assignedTo) {
            diagramNode.assignedTo = savedNode.assignedTo;
          }
        }
      }
    };
    reader.readAsText(file);
  };

  input.click();
}

  public validateDiagram(): void {
    const nodes = this.diagramComponent.nodes as NodeModel[];
    const connectors = this.diagramComponent.connectors as ConnectorModel[];

    const incomingMap = new Map<string, number>();
    const outgoingMap = new Map<string, number>();
    let startCount = 0;
    let endCount = 0;

    for (const connector of connectors) {
      if (connector.sourceID) {
        outgoingMap.set(connector.sourceID, (outgoingMap.get(connector.sourceID) || 0) + 1);
      }
      if (connector.targetID) {
        incomingMap.set(connector.targetID, (incomingMap.get(connector.targetID) || 0) + 1);
      }
    }

    for (const node of nodes) {
      const label = node.annotations?.[0]?.content || '';
      const nodeId = node.id;

      if (!nodeId) continue;

      const inCount = incomingMap.get(nodeId) || 0;
      const outCount = outgoingMap.get(nodeId) || 0;

      if (label === 'Start') startCount++;
      if (label === 'Ende') endCount++;

      if (label === 'Verzweigung') {
        if (outCount > 2) {
          alert(`Fehler: Verzweigung "${label}" hat mehr als 2 ausgehende Verbindungen.`);
          return;
        }
      } else {
        if (inCount > 1 || outCount > 1) {
          alert(`Fehler: Baustein "${label}" darf nur je eine Ein- und Ausgangsverbindung haben.`);
          return;
        }
      }
    }

    if (startCount !== 1 || endCount !== 1) {
      alert('Fehler: Es muss genau ein Start- und ein Ende-Baustein vorhanden sein.');
      return;
    }

    alert('Validierung erfolgreich! 🎉');
  }

  onSubmitWorkflow(): void {
    const nodes = this.diagramComponent.nodes as NodeModel[];
    const connectors = this.diagramComponent.connectors as ConnectorModel[];

    const result: ReducedNode[] = nodes
      .filter(n => !!n.id)
      .map(node => {
        const outgoing = connectors
          .filter(c => c.sourceID === node.id)
          .map(c => c.targetID || '')
          .filter(id => id !== '');

        return {
          id: node.id!,
          label: node.annotations?.[0]?.content || '',
          assignedTo: (node as any).assignedTo || undefined,
          next: outgoing
        };
      });

    this.dataServ.setWorkflow(result);
    if (!this.templateId) {
      alert('Fehler: Template-ID fehlt für Rückkehr.');
      return;
    }

    this.router.navigate(['/cs', this.templateId]);
  }
}