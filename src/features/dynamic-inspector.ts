import { ChangeModelOperation } from '@dynamic-glsp/protocol';
import {
  AbstractUIExtension,
  EditorContextService,
  FeatureModule,
  GModelElement,
  GModelRoot,
  IActionDispatcher,
  IDiagramOptions,
  IDiagramStartup,
  ISelectionListener,
  MaybePromise,
  TYPES
} from '@eclipse-glsp/client';

import { EventEmitter } from 'events';
import { inject, injectable } from 'inversify';

export const dynamicInspectorModule = new FeatureModule(
  (bind, _unbind) => {
    bind(DynamicInspector).toSelf().inSingletonScope();
    bind(TYPES.IUIExtension).toService(DynamicInspector);
    bind(TYPES.IDiagramStartup).toService(DynamicInspector);
    bind(TYPES.ISelectionListener).toService(DynamicInspector);
  },
  { featureId: Symbol('inspector') }
);

@injectable()
export class DynamicInspector extends AbstractUIExtension implements ISelectionListener, IDiagramStartup {
  @inject(TYPES.IDiagramOptions)
  protected diagramOptions!: IDiagramOptions;

  @inject(TYPES.IActionDispatcher)
  protected actionDispatcher!: IActionDispatcher;

  @inject(EditorContextService)
  protected editorContext!: EditorContextService;

  static readonly ID = 'inspector';

  id() {
    return DynamicInspector.ID;
  }

  containerClass() {
    return DynamicInspector.ID;
  }

  onElementChange: EventEmitter = new EventEmitter();

  async updateElement(elementId: string, newModel: any) {
    console.log('Model Changed', elementId, newModel);
    const modelChangeOperation = ChangeModelOperation.create({ elementId, newModel });
    await this.actionDispatcher.dispatch(modelChangeOperation);
  }

  initializeContents(containerElement: HTMLElement): void {
    this.setNoSelection();
  }

  postModelInitialization(): MaybePromise<void> {
    this.show(this.editorContext.modelRoot);
  }

  selectionChanged(root: Readonly<GModelRoot>, selectedElements: string[], deselectedElements?: string[]): void {
    // if diagram options editMode is readonly, do not show the inspector
    if (this.diagramOptions.editMode === 'readonly') return;

    if (selectedElements.length === 1) {
      const selectedElement = this.getGModelElement(root, selectedElements[0]);
      if (selectedElement) this.setElement(selectedElement);
    } else {
      this.setNoSelection();
    }
  }

  /**
   * Sets the inspector content when no element is selected.
   */
  protected setNoSelection() {
    // const noSelection = document.createElement('div');
    // noSelection.classList.add('no-selection');
    // noSelection.textContent = 'Select an element to inspect';

    this.containerElement.classList.add('collapsed');

    // wait for the container to be collapsed before removing the content
    setTimeout(() => {
      this.containerElement.innerHTML = '';
    }, 200);

    // this.containerElement.appendChild(noSelection);
  }

  /**
   * Sets the inspector content for the given element.
   */
  protected setElement(selectedElement: any) {
    console.log('SELECTED ELEMENT', selectedElement);

    this.containerElement.innerHTML = '';

    const title = document.createElement('h4');
    title.textContent = selectedElement.args?.elementLabel;
    this.containerElement.appendChild(title);

    const formContainer = document.createElement('div');
    formContainer.classList.add('form-container');
    this.containerElement.appendChild(formContainer);

    // if the selected element has no aModel or model, do not create the element
    // probably must show a error message
    if (!selectedElement.args?.aModel || !selectedElement.args?.model) {
      console.error('AModel or Model not found in element to inspect.');
      this.setNoSelection();
      return;
    }

    // check if the inspectorCreateElement method is defined and call it
    this.onElementChange.emit(
      'select',
      formContainer,
      selectedElement.id,
      selectedElement.args?.aModel,
      selectedElement.args?.model
    );

    this.containerElement.classList.remove('collapsed');
  }

  /**
   * Get the GModel element for the given id and root.
   */
  protected getGModelElement(root: Readonly<GModelRoot>, id: string): GModelElement | undefined {
    return root?.children?.find((child) => child.id === id) as GModelElement;
  }
}
