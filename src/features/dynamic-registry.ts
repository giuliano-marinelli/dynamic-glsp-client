import {
  FeatureModule,
  GModelElementConstructor,
  GModelRegistry,
  GViewRegistry,
  IView,
  TYPES,
  createFeatureSet
} from '@eclipse-glsp/client';

import { inject, injectable } from 'inversify';

export const dynamicRegistryModule = new FeatureModule(
  (bind, _unbind) => {
    bind(DynamicRegistry).toSelf().inSingletonScope();
  },
  { featureId: Symbol('registry') }
);

@injectable()
export class DynamicRegistry {
  @inject(TYPES.ViewRegistry)
  protected viewRegistry!: GViewRegistry;

  @inject(TYPES.SModelRegistry)
  protected modelRegistry!: GModelRegistry;

  register(key: string, model: any, view: IView): void {
    this.viewRegistry.register(key, view);

    this.modelRegistry.register(key, () => {
      const element = new model();
      element.features = createFeatureSet(this.getDefaultFeatures(model));
      return element;
    });
  }

  getDefaultFeatures(constr: GModelElementConstructor): ReadonlyArray<symbol> | undefined {
    let obj = constr;
    do {
      const defaultFeatures = obj.DEFAULT_FEATURES;
      if (defaultFeatures) return defaultFeatures;
      obj = Object.getPrototypeOf(obj);
    } while (obj);
    return undefined;
  }
}
