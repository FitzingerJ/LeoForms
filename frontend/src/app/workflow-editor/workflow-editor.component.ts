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
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatChipInput } from '@angular/material/chips';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ContextMenuSettingsModel, IClickEventArgs } from '@syncfusion/ej2-angular-diagrams';
import type { ClickEventArgs as ToolbarClickArgs } from '@syncfusion/ej2-navigations';


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

type NodeKind = 'Schritt' | 'Verzweigung' | 'Rücksprung'; 

@Component({
  selector: 'app-workflow-editor',
  templateUrl: './workflow-editor.component.html',
  styleUrls: ['./workflow-editor.component.css']
})
export class WorkflowEditorComponent implements OnInit {
  @ViewChild('diagram') diagramComponent!: DiagramComponent;
  @ViewChild('symbolPalette') symbolPaletteComponent!: SymbolPaletteComponent;

  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  
  assignmentList: string[] = [];
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
  availableAssignments: string[] = [
    'Direktor',
    'Sekretariat',
    'AV Informatik/IT-Medientechnik',
    'AV Elektronik/Medizintechnik',
    'Werkstättenleiter',

    'KV_5AHITM', 'KV_5BHITM', 'KV_5CHITM',
    'KV_4AHITM', 'KV_4BHITM', 'KV_4CHITM',

    'KV_Beispiel',
    'Lehrer_Beispiel',
    'Schueler_Beispiel'
  ];
  selectedNodeForAssignment: NodeModel | null = null;

  constructor(private dataServ: DataService, private router: Router, private route: ActivatedRoute) {}

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (!this.diagramComponent) return;

      const full = localStorage.getItem('fullWorkflow-' + this.templateId);
      if (full) {
        this.diagramComponent.loadDiagram(full);

        const parsed = JSON.parse(full);
        for (const node of parsed.nodes) {
          const obj = this.diagramComponent.getObject(node.id) as any;
          if (obj && node.assignedTo) {
            obj.assignedTo = node.assignedTo;

            const baseLabel = obj.annotations?.[0]?.content?.split('\n')[0] || '';
            
            // 👇 Unterstützt sowohl Array als auch einzelnes Assignment
            const assignedNames = Array.isArray(node.assignedTo)
              ? node.assignedTo.map((a: Assignment) => a.name).join(', ')
              : node.assignedTo.name;

            obj.annotations[0].content = `${baseLabel}\n(${assignedNames})`;
          }
        }
      }
    }, 0);
  }

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

    if (label === 'Start' || label === 'Ende' || label.startsWith('Rücksprung')) {
      this.selectedNodeForAssignment = null;
      this.assignmentControl.setValue('');
      return;
    }

    this.selectedNodeForAssignment = element;
    const assigned = (element as any).assignedTo;
    this.assignmentList = Array.isArray(assigned)
      ? assigned.map((a: any) => a.name)
      : assigned?.name ? [assigned.name] : [];
    this.assignmentControl.setValue('');
    if (Array.isArray(assigned)) {
      this.assignmentControl.setValue(assigned.map((a: Assignment) => a.name).join(', '));
    } else if (assigned?.name) {
      this.assignmentControl.setValue(assigned.name);
    }
  }

  private _filterAssignments(value: string): string[] {
    const v = (value || '').toLowerCase();
    return this.availableAssignments.filter(opt => opt.toLowerCase().includes(v));
  }

  addAssignment(value: string) {
    if (!this.assignmentList.includes(value)) {
      this.assignmentList.push(value);
      this.updateAssignmentInNode();
    }
    this.assignmentControl.setValue('');
  }

  addAssignmentFromText(event: MatChipInputEvent) {
    const value = (event.value || '').trim();
    if (value && !this.assignmentList.includes(value)) {
      this.assignmentList.push(value);
      this.updateAssignmentInNode();
    }
    this.assignmentControl.setValue('');
  }

  removeAssignment(value: string) {
    const index = this.assignmentList.indexOf(value);
    if (index >= 0) {
      this.assignmentList.splice(index, 1);
      this.updateAssignmentInNode();
    }
  }

  updateAssignmentInNode() {
    if (!this.selectedNodeForAssignment) return;

    const assignments: Assignment[] = this.assignmentList.map(name => {
      const mapped = this.dataServ.getEmailForRole?.(name);
      const isEmail = name.includes('@');
      return {
        name,
        email: isEmail ? name : (mapped || undefined)
      };
    });

    (this.selectedNodeForAssignment as any).assignedTo = assignments;

    const baseLabel = this.selectedNodeForAssignment.annotations?.[0]?.content?.split('\n')[0] || '';
    this.selectedNodeForAssignment.annotations![0].content = `${baseLabel}\n(${this.assignmentList.join(', ')})`;
  }

  onAssignmentSelected(event: MatAutocompleteSelectedEvent): void {
    const value = event.option.value;
    this.setAssignment(value);
  }

  private setAssignment(value: string): void {
    if (!this.selectedNodeForAssignment) return;

    const mapped = this.dataServ.getEmailForRole?.(value);
    const isEmail = value.includes('@');

    const assignment: Assignment = {
      name: value,
      email: isEmail ? value : (mapped || undefined)
    };

    (this.selectedNodeForAssignment as any).assignedTo = assignment;

    const baseLabel = this.selectedNodeForAssignment.annotations?.[0]?.content?.split('\n')[0] || '';
    this.selectedNodeForAssignment.annotations![0].content = `${baseLabel}\n(${assignment.name})`;
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

  isBranchNode(): boolean {
    return this.selectedNodeForAssignment?.id?.startsWith('Verzweigung') ?? false;
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



    // 🟩 Speichern reduzierte Workflow-Variante
    localStorage.setItem('workflow-' + this.templateId, JSON.stringify(result));

    // 🟦 Speichern vollständiger Workflow (inkl. style, shape, annotations etc.)
    const full = JSON.parse(this.diagramComponent.saveDiagram());
    for (const node of this.diagramComponent.nodes) {
      const target = full.nodes.find((n: any) => n.id === node.id);
      if (target && (node as any).assignedTo) {
        target.assignedTo = (node as any).assignedTo;
      }
    }

    localStorage.setItem('fullWorkflow-' + this.templateId, JSON.stringify(full));

    this.router.navigate(['/cs', this.templateId]);
  }

  public contextMenuSettings: ContextMenuSettingsModel = {
    show: true,
    items: [
      {
        text: 'Vorher einfügen',
        id: 'insertBefore',
        items: [
          { text: 'Schritt', id: 'insertBefore:Schritt' },
          { text: 'Verzweigung', id: 'insertBefore:Verzweigung' },
          { text: 'Rücksprung', id: 'insertBefore:Rücksprung' }
        ]
      },
      {
        text: 'Nachher einfügen',
        id: 'insertAfter',
        items: [
          { text: 'Schritt', id: 'insertAfter:Schritt' },
          { text: 'Verzweigung', id: 'insertAfter:Verzweigung' },
          { text: 'Rücksprung', id: 'insertAfter:Rücksprung' }
        ]
      }
    ]
  };

  private layoutStartX = 420;
  private layoutStartY = 120;
  private layoutVGap   = 110;

  public onContextMenuClick(args: IClickEventArgs): void {
    const itemId: string = (args as any)?.item?.id ?? '';
    const elementId =
      (args as any)?.element?.id ??
      this.diagramComponent?.selectedItems?.nodes?.[0]?.id ??
      this.diagramComponent?.selectedItems?.connectors?.[0]?.id;

    const selected =
      elementId ? (this.diagramComponent.getObject(elementId) as any) : null;

    if (!selected || !itemId.includes(':')) return;

    const [action, kindStr] = itemId.split(':');
    const kind = kindStr as NodeKind;

    if (action === 'insertBefore') {
      this.insertNodeBefore(selected, kind);
    } else if (action === 'insertAfter') {
      this.insertNodeAfter(selected, kind);
    }

    // nach jedem Einfügen optional automatisch anordnen
    this.autoLayout();
  }

  public autoLayout(): void {
    const nodes = this.diagramComponent.nodes as NodeModel[];

    // Versuch, von "Start" der Reihenfolge entlang der Kanten zu folgen
    const order = this.computeLinearOrder();
    const positioned = new Set<string>();

    let y = this.layoutStartY;

    const place = (nodeId: string) => {
      if (positioned.has(nodeId)) return;
      const n = this.diagramComponent.getObject(nodeId) as NodeModel;
      if (!n) return;
      n.offsetX = this.layoutStartX;
      n.offsetY = y;
      y += this.layoutVGap;
      positioned.add(nodeId);
    };

    // 1) falls Reihenfolge gefunden, zuerst danach platzieren
    order.forEach(id => place(id));

    // 2) Rest (unverbundene oder nicht gefunden) hinten anhängen
    nodes.forEach(n => { if (n.id && !positioned.has(n.id)) place(n.id); });

    this.diagramComponent.dataBind();
  }

  private computeLinearOrder(): string[] {
    const nodes = this.diagramComponent.nodes as NodeModel[];
    const conns = this.diagramComponent.connectors as ConnectorModel[];

    const idSet = new Set(nodes.map(n => n.id as string));
    const incoming = new Map<string, number>();
    const nextMap  = new Map<string, string[]>();

    idSet.forEach(id => { incoming.set(id, 0); nextMap.set(id, []); });

    conns.forEach(c => {
      if (!c.sourceID || !c.targetID) return;
      if (!idSet.has(c.sourceID) || !idSet.has(c.targetID)) return;
      incoming.set(c.targetID, (incoming.get(c.targetID) || 0) + 1);
      nextMap.get(c.sourceID)!.push(c.targetID);
    });

    // Start suchen (Label "Start" oder 0 incoming)
    const start =
      nodes.find(n => n.annotations?.[0]?.content === 'Start')?.id ||
      [...incoming.entries()].find(([_, v]) => v === 0)?.[0];

    if (!start) return nodes.map(n => n.id!).filter(Boolean);

    const order: string[] = [];
    const seen = new Set<string>();
    let cur: string | undefined = start;

    // einfache Kette ablaufen (bei Verzweigung nehmen wir den ersten Ausgang)
    while (cur && !seen.has(cur)) {
      order.push(cur);
      seen.add(cur);
      const nextMap: Map<string, string[]> = new Map();

      // Then here:
      const outs: string[] = nextMap.get(cur) ?? [];
      if (outs.length === 0) break;
      cur = outs[0];
    }

    return order;
  }

  private createNode(kind: NodeKind): NodeModel {
    const common = {
      width: 100,
      height: kind === 'Verzweigung' ? 80 : 50,
      annotations: [{ content: kind }],
      ports: [
        { id: 'top', offset: { x: 0.5, y: 0 },   visibility: 1, shape: 'Circle' },
        { id: 'bottom', offset: { x: 0.5, y: 1 }, visibility: 1, shape: 'Circle' }
      ]
    } as Partial<NodeModel>;

    if (kind === 'Schritt') {
      return {
        id: `Schritt_${Date.now()}`,
        shape: { type: 'Flow', shape: 'Process' },
        style: { fill: '#28A745', strokeColor: 'white' },
        ...common
      };
    }
    if (kind === 'Verzweigung') {
      return {
        id: `Verzweigung_${Date.now()}`,
        shape: { type: 'Flow', shape: 'Decision' },
        style: { fill: '#FFC107', strokeColor: 'white' },
        ...common
      };
    }
    // Rücksprung
    return {
      id: `Rücksprung_${Date.now()}`,
      shape: { type: 'Basic', shape: 'Hexagon' },
      style: { fill: '#6F42C1', strokeColor: 'white' },
      ...common
    };
  }

  private insertNodeBefore(target: NodeModel, kind: NodeKind): void {
    if (!target?.id) return;

    const newNode = this.createNode(kind);
    // grobe Position in der Nähe setzen (Layout räumt später auf)
    newNode.offsetX = (target.offsetX || this.layoutStartX);
    newNode.offsetY = (target.offsetY || this.layoutStartY) - 60;

    this.diagramComponent.add(newNode);

    // 1) alle Connectors, die auf target zeigen, auf newNode umbiegen
    (this.diagramComponent.connectors as ConnectorModel[])
      .filter(c => c.targetID === target.id)
      .forEach(c => { c.targetID = newNode.id!; });

    // 2) newNode → target verbinden
    const link: ConnectorModel = {
      id: `connector_${newNode.id}_${target.id}_${Date.now()}`,
      sourceID: newNode.id!,
      targetID: target.id!,
      type: 'Straight'
    };
    this.diagramComponent.add(link);

    this.diagramComponent.dataBind();
  }

  private insertNodeAfter(target: NodeModel, kind: NodeKind): void {
    if (!target?.id) return;

    // Wenn target mehrere ausgehende Kanten hat (z.B. Verzweigung), blocken wir das einfache „Nachher einfügen“,
    // damit deine Validierungsregeln (1 in/1 out) sauber bleiben.
    const out = (this.diagramComponent.connectors as ConnectorModel[]).filter(c => c.sourceID === target.id);
    if (out.length > 1) {
      alert('Nachher einfügen ist direkt hinter einer Verzweigung mit mehreren Ausgängen nicht möglich.');
      return;
    }

    const newNode = this.createNode(kind);
    newNode.offsetX = (target.offsetX || this.layoutStartX);
    newNode.offsetY = (target.offsetY || this.layoutStartY) + 60;
    this.diagramComponent.add(newNode);

    // 1) bisheriges Ziel von target (falls vorhanden) merken
    const oldTargets = out.map(c => c.targetID!).filter(Boolean);

    // 2) vorhandene Kante(n) vom target entfernen
    out.forEach(c => this.diagramComponent.remove(c));

    // 3) target → newNode legen
    const link1: ConnectorModel = {
      id: `connector_${target.id}_${newNode.id}_${Date.now()}`,
      sourceID: target.id!,
      targetID: newNode.id!,
      type: 'Straight'
    };
    this.diagramComponent.add(link1);

    // 4) newNode → altes Ziel wieder verbinden (falls es eines gab)
    oldTargets.forEach(tid => {
      const link2: ConnectorModel = {
        id: `connector_${newNode.id}_${tid}_${Date.now()}`,
        sourceID: newNode.id!,
        targetID: tid,
        type: 'Straight'
      };
      this.diagramComponent.add(link2);
    });

    this.diagramComponent.dataBind();
  }
}