import {
  ApplyTypeHintsCommand,
  FeatureModule,
  FeatureSet,
  GModelElement,
  GModelElementSchema,
  SetTypeHintsAction,
  TYPES,
  TypeHint,
  TypeHintProvider,
  bindAsService,
  configureActionHandler,
  configureCommand,
  createFeatureSet
} from '@eclipse-glsp/client';

import { injectable } from 'inversify';

export const dynamicTypeHintsModule = new FeatureModule(
  (bind, unbind, isBound) => {
    const context = { bind, unbind, isBound };
    bindAsService(context, TYPES.ITypeHintProvider, DynamicTypeHintProvider);
    bind(TYPES.IDiagramStartup).toService(DynamicTypeHintProvider);
    configureActionHandler(context, SetTypeHintsAction.KIND, DynamicTypeHintProvider);
    configureCommand(context, DynamicApplyTypeHintsCommand);
  },
  { featureId: Symbol('typeHints') }
);

@injectable()
export class DynamicApplyTypeHintsCommand extends ApplyTypeHintsCommand {
  protected typeHintFeatures: Map<string, FeatureSet> = new Map();

  protected override applyShapeTypeHint(element: GModelElement): void {
    // get the features for the given element based on their args elementType
    element.features = this.getTypeFeatures(element);
    super.applyShapeTypeHint(element);
  }

  /**
   * Get the features for the given element based on their args elementType
   *
   * If the elementType is registered in the typeHintFeatures map, return existing features
   * Otherwise, clone the features from the element and add the new features to the map
   */
  protected getTypeFeatures(element: GModelElement): FeatureSet {
    const type = element['args']?.elementType ? element['args']?.elementType : element.type;
    let features = this.typeHintFeatures.get(type);
    if (!features) {
      features = element.features
        ? createFeatureSet(Array.from(element.features as Set<symbol>))
        : createFeatureSet([]);
      this.typeHintFeatures.set(type, features);
    }
    return features;
  }
}

@injectable()
export class DynamicTypeHintProvider extends TypeHintProvider {
  override getTypeHint<T extends TypeHint>(
    input: GModelElement | GModelElementSchema | string,
    hints: Map<string, T>
  ): T | undefined {
    // return the type hint based on the args elementType
    const type =
      typeof input === 'string' ? input : input['args']?.elementType ? input['args']?.elementType : input.type;

    let hint = hints.get(type);
    // Check subtypes
    if (hint === undefined) {
      const subtypes = type.split(':');
      while (hint === undefined && subtypes.length > 0) {
        subtypes.pop();
        hint = hints.get(subtypes.join(':'));
        if (hint) {
          // add received subtype hint to map to avoid future recomputation
          hints.set(type, hint);
          break;
        }
      }
    }

    return hint;
  }
}
