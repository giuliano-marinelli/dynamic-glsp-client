import {
  Args,
  ArgsAware,
  Dimension,
  GNode,
  argsFeature,
  boundsFeature,
  fadeFeature,
  layoutContainerFeature,
  layoutableChildFeature
} from '@eclipse-glsp/client';

export class GShape extends GNode implements ArgsAware {
  static override readonly DEFAULT_FEATURES = [
    boundsFeature,
    layoutableChildFeature,
    layoutContainerFeature,
    fadeFeature,
    argsFeature
  ];

  args?: Args;

  override size: Dimension = Dimension.ZERO;
}
