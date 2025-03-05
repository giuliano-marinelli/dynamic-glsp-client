import {
  Bounds,
  BoundsData,
  Dimension,
  GModelElement,
  GParentElement,
  HBoxLayoutOptionsExt,
  HBoxLayouterExt,
  LayoutContainer,
  LayouterExt,
  Point,
  StatefulLayouterExt,
  VBoxLayoutOptionsExt,
  VBoxLayouterExt,
  isLayoutableChild
} from '@eclipse-glsp/client';

import { injectable } from 'inversify';

export interface DynamicVBoxLayoutOptions extends VBoxLayoutOptionsExt {
  absolute?: boolean;
  relWidth?: string;
  relHeight?: string;
  relX?: string;
  relY?: string;
}

export interface DynamicHBoxLayoutOptions extends HBoxLayoutOptionsExt {
  absolute?: boolean;
  relWidth?: string;
  relHeight?: string;
  relX?: string;
  relY?: string;
}

@injectable()
export class DynamicLayouter extends LayouterExt {
  override layout(element2boundsData: Map<GModelElement, BoundsData>) {
    new DynamicStatefulLayouter(element2boundsData, this.layoutRegistry, this.logger).layout();
  }
}

export class DynamicStatefulLayouter extends StatefulLayouterExt {
  getAbsoluteContainerBoundsData(
    container: GParentElement & LayoutContainer,
    layoutOptions: DynamicVBoxLayoutOptions | DynamicHBoxLayoutOptions,
    childrenSize: Dimension,
    fixedSize: Bounds
  ): Bounds {
    const boundsData = this.getBoundsData(container);

    const currentWidth = boundsData.bounds?.width || 0;
    const currentHeight = boundsData.bounds?.height || 0;

    const maxWidth =
      layoutOptions.paddingFactor *
      (layoutOptions.resizeContainer
        ? Math.max(fixedSize.width, childrenSize.width + layoutOptions.paddingLeft + layoutOptions.paddingRight)
        : Math.max(0, fixedSize.width));
    const maxHeight =
      layoutOptions.paddingFactor *
      (layoutOptions.resizeContainer
        ? Math.max(fixedSize.height, childrenSize.height + layoutOptions.paddingTop + layoutOptions.paddingBottom)
        : Math.max(0, fixedSize.height));

    const width = Math.max(currentWidth, maxWidth);
    const height = Math.max(currentHeight, maxHeight);

    return { width, height, x: 0, y: 0 };
  }

  getAbsoluteBoundsData(
    childOptions: DynamicVBoxLayoutOptions | DynamicHBoxLayoutOptions,
    maxWidth: number,
    maxHeight: number
  ) {
    let width = 0;
    let height = 0;
    let x = 0;
    let y = 0;

    // calculate size and position based on child layout options (relative width, height, x, y)
    // if size and/or position are percentage defined, calculate the absolute value with container maxWidth and maxHeight
    if (childOptions.relWidth)
      width =
        (childOptions.relWidth?.toString().endsWith('%')
          ? (maxWidth || 0) * (parseFloat(childOptions.relWidth?.toString()) / 100)
          : parseFloat(childOptions.relWidth?.toString())) ?? 0;

    if (childOptions.relHeight)
      height =
        (childOptions.relHeight?.toString().endsWith('%')
          ? (maxHeight || 0) * (parseFloat(childOptions.relHeight?.toString()) / 100)
          : parseFloat(childOptions.relHeight?.toString())) ?? 0;

    if (childOptions.relX)
      x =
        (childOptions.relX?.toString().endsWith('%')
          ? (maxWidth || 0) * (parseFloat(childOptions.relX?.toString()) / 100)
          : parseFloat(childOptions.relX?.toString())) ?? 0;

    if (childOptions.relY)
      y =
        (childOptions.relY?.toString().endsWith('%')
          ? (maxHeight || 0) * (parseFloat(childOptions.relY?.toString()) / 100)
          : parseFloat(childOptions.relY?.toString())) ?? 0;

    return { width, height, x, y };
  }

  isAbsoluteChildFixed(layoutOptions: DynamicVBoxLayoutOptions | DynamicHBoxLayoutOptions): boolean {
    return (
      layoutOptions.absolute &&
      !layoutOptions.relWidth?.toString().includes('%') &&
      !layoutOptions.relHeight?.toString().includes('%') &&
      !layoutOptions.relX?.toString().includes('%') &&
      !layoutOptions.relY?.toString().includes('%')
    );
  }

  isAbsoluteChildVerticallyFixed(layoutOptions: DynamicVBoxLayoutOptions | DynamicHBoxLayoutOptions): boolean {
    return (
      layoutOptions.absolute &&
      !layoutOptions.relHeight?.toString().includes('%') &&
      !layoutOptions.relY?.toString().includes('%')
    );
  }

  isAbsoluteChildHorizontallyFixed(layoutOptions: DynamicVBoxLayoutOptions | DynamicHBoxLayoutOptions): boolean {
    return (
      layoutOptions.absolute &&
      !layoutOptions.relWidth?.toString().includes('%') &&
      !layoutOptions.relX?.toString().includes('%')
    );
  }
}

@injectable()
export class DynamicVBoxLayouter extends VBoxLayouterExt {
  protected override getChildrenSize(
    container: GParentElement & LayoutContainer,
    containerOptions: DynamicVBoxLayoutOptions,
    layouter: DynamicStatefulLayouter
  ): Dimension {
    let relativeMaxWidth = -1;
    let relativeMaxHeight = 0;
    let isFirst = true;

    let absoluteMaxWidth = 0;
    let absoluteMaxHeight = 0;

    container.children.forEach((child) => {
      // omit absolute children from size calculation
      if (isLayoutableChild(child)) {
        const childOptions = this.getChildLayoutOptions(child, containerOptions);
        if (childOptions.absolute) {
          const bounds = layouter.getAbsoluteBoundsData(childOptions, 0, 0);
          if (layouter.isAbsoluteChildVerticallyFixed(childOptions)) {
            absoluteMaxHeight = Math.max(
              absoluteMaxHeight,
              bounds.y + bounds.height - containerOptions.paddingLeft - containerOptions.paddingRight
            );
          }
          if (layouter.isAbsoluteChildHorizontallyFixed(childOptions)) {
            absoluteMaxWidth = Math.max(
              absoluteMaxWidth,
              bounds.x + bounds.width - containerOptions.paddingTop - containerOptions.paddingBottom
            );
          }
        } else {
          const bounds = layouter.getBoundsData(child).bounds;
          if (bounds !== undefined && Dimension.isValid(bounds)) {
            relativeMaxHeight += bounds.height;
            if (isFirst) {
              isFirst = false;
            } else {
              relativeMaxHeight += containerOptions.vGap;
            }
            relativeMaxWidth = Math.max(relativeMaxWidth, bounds.width);
          }
        }
      }
    });
    const result = {
      width: Math.max(relativeMaxWidth, absoluteMaxWidth),
      height: Math.max(relativeMaxHeight, absoluteMaxHeight)
    };
    return result;
  }

  protected override layoutChildren(
    container: GParentElement & LayoutContainer,
    layouter: DynamicStatefulLayouter,
    containerOptions: DynamicVBoxLayoutOptions,
    maxWidth: number,
    maxHeight: number,
    grabHeight?: number,
    grabbingChildren?: number
  ): Point {
    let currentOffset: Point = {
      x: containerOptions.paddingLeft + 0.5 * (maxWidth - maxWidth / containerOptions.paddingFactor),
      y: containerOptions.paddingTop + 0.5 * (maxHeight - maxHeight / containerOptions.paddingFactor)
    };

    // layout all relative children
    container.children.forEach((child) => {
      if (isLayoutableChild(child)) {
        const boundsData = layouter.getBoundsData(child);
        const bounds = boundsData.bounds;
        const childOptions = this.getChildLayoutOptions(child, containerOptions);
        if (bounds !== undefined && Dimension.isValid(bounds) && !childOptions.absolute) {
          currentOffset = this.layoutChild(
            child,
            boundsData,
            bounds,
            childOptions,
            containerOptions,
            currentOffset,
            maxWidth,
            maxHeight,
            grabHeight,
            grabbingChildren
          );
        }
      }
    });

    // calculate container bounds for absolute children
    const childrenSize = this.getChildrenSize(container, containerOptions, layouter);
    const fixedSize = this.getFixedContainerBounds(container, containerOptions, layouter);
    const absoluteContainerBounds = layouter.getAbsoluteContainerBoundsData(
      container,
      containerOptions,
      childrenSize,
      fixedSize
    );

    // layout all absolute children
    container.children.forEach((child) => {
      if (isLayoutableChild(child)) {
        const childOptions = this.getChildLayoutOptions(child, containerOptions);
        if (childOptions.absolute) {
          const boundsData = layouter.getBoundsData(child);
          const bounds = layouter.getAbsoluteBoundsData(
            childOptions,
            absoluteContainerBounds.width,
            absoluteContainerBounds.height
          );
          if (bounds !== undefined && Dimension.isValid(bounds)) {
            boundsData.bounds = bounds;
            boundsData.boundsChanged = true;
          }
        }
      }
    });

    return currentOffset;
  }
}

@injectable()
export class DynamicHBoxLayouter extends HBoxLayouterExt {
  protected override getChildrenSize(
    container: GParentElement & LayoutContainer,
    containerOptions: DynamicHBoxLayoutOptions,
    layouter: DynamicStatefulLayouter
  ): Dimension {
    let relativeMaxWidth = 0;
    let relativeMaxHeight = -1;
    let isFirst = true;

    let absoluteMaxWidth = 0;
    let absoluteMaxHeight = 0;

    container.children.forEach((child) => {
      // omit absolute children from size calculation
      if (isLayoutableChild(child)) {
        const childOptions = this.getChildLayoutOptions(child, containerOptions);
        if (childOptions.absolute) {
          const bounds = layouter.getAbsoluteBoundsData(childOptions, 0, 0);
          if (layouter.isAbsoluteChildVerticallyFixed(childOptions)) {
            absoluteMaxHeight = Math.max(
              absoluteMaxHeight,
              bounds.y + bounds.height - containerOptions.paddingLeft - containerOptions.paddingRight
            );
          }
          if (layouter.isAbsoluteChildHorizontallyFixed(childOptions)) {
            absoluteMaxWidth = Math.max(
              absoluteMaxWidth,
              bounds.x + bounds.width - containerOptions.paddingTop - containerOptions.paddingBottom
            );
          }
        } else {
          const bounds = layouter.getBoundsData(child).bounds;
          if (bounds !== undefined && Dimension.isValid(bounds)) {
            relativeMaxWidth += bounds.width;
            if (isFirst) {
              isFirst = false;
            } else {
              relativeMaxWidth += containerOptions.hGap;
            }
            relativeMaxHeight = Math.max(relativeMaxHeight, bounds.height);
          }
        }
      }
    });
    const result = {
      width: Math.max(relativeMaxWidth, absoluteMaxWidth),
      height: Math.max(relativeMaxHeight, absoluteMaxHeight)
    };
    return result;
  }

  protected override layoutChildren(
    container: GParentElement & LayoutContainer,
    layouter: DynamicStatefulLayouter,
    containerOptions: DynamicHBoxLayoutOptions,
    maxWidth: number,
    maxHeight: number,
    grabHeight?: number,
    grabbingChildren?: number
  ): Point {
    let currentOffset: Point = {
      x: containerOptions.paddingLeft + 0.5 * (maxWidth - maxWidth / containerOptions.paddingFactor),
      y: containerOptions.paddingTop + 0.5 * (maxHeight - maxHeight / containerOptions.paddingFactor)
    };

    // layout all relative children
    container.children.forEach((child) => {
      if (isLayoutableChild(child)) {
        const boundsData = layouter.getBoundsData(child);
        const bounds = boundsData.bounds;
        const childOptions = this.getChildLayoutOptions(child, containerOptions);
        if (bounds !== undefined && Dimension.isValid(bounds) && !childOptions.absolute) {
          currentOffset = this.layoutChild(
            child,
            boundsData,
            bounds,
            childOptions,
            containerOptions,
            currentOffset,
            maxWidth,
            maxHeight,
            grabHeight,
            grabbingChildren
          );
        }
      }
    });

    // calculate container bounds for absolute children
    const childrenSize = this.getChildrenSize(container, containerOptions, layouter);
    const fixedSize = this.getFixedContainerBounds(container, containerOptions, layouter);
    const absoluteContainerBounds = layouter.getAbsoluteContainerBoundsData(
      container,
      containerOptions,
      childrenSize,
      fixedSize
    );

    // layout all absolute children
    container.children.forEach((child) => {
      if (isLayoutableChild(child)) {
        const childOptions = this.getChildLayoutOptions(child, containerOptions);
        if (childOptions.absolute) {
          const boundsData = layouter.getBoundsData(child);
          const bounds = layouter.getAbsoluteBoundsData(
            childOptions,
            absoluteContainerBounds.width,
            absoluteContainerBounds.height
          );
          if (bounds !== undefined && Dimension.isValid(bounds)) {
            boundsData.bounds = bounds;
            boundsData.boundsChanged = true;
          }
        }
      }
    });

    return currentOffset;
  }
}
