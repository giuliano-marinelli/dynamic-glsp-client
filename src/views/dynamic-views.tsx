import { Dimension, GNode, RenderingContext, ShapeView, svg } from '@eclipse-glsp/client';

import { GShape } from '../model';
import { injectable } from 'inversify';
import { VNode } from 'snabbdom';

const JSX = { createElement: svg };

@injectable()
export class DynamicNodeView extends ShapeView {
  render(element: Readonly<GNode>, context: RenderingContext): VNode {
    if (!this.isVisible(element, context)) {
      return undefined;
    }

    return (
      <g class-mouseover={element.hoverFeedback}>
        {context.renderChildren(element)}
        <rect
          class-selected={element.selected}
          style-strokeWidth={2}
          style-fill={'none'}
          width={element.size.width}
          height={element.size.height}
        ></rect>
      </g>
    );
  }
}

@injectable()
export class DynamicShapeView extends ShapeView {
  render(element: Readonly<GShape>, context: RenderingContext): VNode | undefined {
    if (!this.isVisible(element, context)) {
      return undefined;
    }

    // get element shape
    const shape = element.args?.shape || 'rectangle';

    // get shape svg
    let shapeSVG: VNode;
    switch (shape) {
      case 'circle':
        shapeSVG = this.renderCircle(element.size);
        break;
      case 'ellipse':
        shapeSVG = this.renderEllipse(element.size);
        break;
      case 'diamond':
        shapeSVG = this.renderDiamond(element.size);
        break;
      default:
      case 'rectangle':
        shapeSVG = this.renderRectangle(element.size);
    }

    if (!shapeSVG.data.style) shapeSVG.data.style = {};

    if (element.args?.fill) shapeSVG.data.style['fill'] = element.args?.fill?.toString();

    if (element.args?.stroke) shapeSVG.data.style['stroke'] = element.args?.stroke?.toString();

    if (element.args?.strokeWidth && !isNaN(parseFloat(element.args?.strokeWidth?.toString())))
      shapeSVG.data.style['stroke-width'] = element.args?.strokeWidth?.toString();

    return (
      <g class-shape={true}>
        {shapeSVG}
        {context.renderChildren(element)}
      </g>
    );
  }

  protected renderRectangle(size: Dimension): VNode {
    return <rect width={size?.width ?? 0} height={size?.height ?? 0}></rect>;
  }

  protected renderCircle(size: Dimension): VNode {
    return (
      <circle
        r={Math.min(size?.width ?? 0, size?.height ?? 0) / 2}
        cx={(size?.width ?? 0) / 2}
        cy={(size?.height ?? 0) / 2}
      ></circle>
    );
  }

  protected renderEllipse(size: Dimension): VNode {
    return (
      <ellipse
        rx={(size?.width ?? 0) / 2}
        ry={(size?.height ?? 0) / 2}
        cx={(size?.width ?? 0) / 2}
        cy={(size?.height ?? 0) / 2}
      ></ellipse>
    );
  }

  protected renderDiamond(size: Dimension): VNode {
    const points = [
      { x: size.width / 2, y: 0 },
      { x: size.width, y: size.height / 2 },
      { x: size.width / 2, y: size.height },
      { x: 0, y: size.height / 2 }
    ];
    return <polygon points={points.map((p) => `${p.x},${p.y}`).join(' ')}></polygon>;
  }
}

// @injectable()
// export class PolylineEdgeView extends PolylineEdgeViewWithGapsOnIntersections {
//   protected override renderAdditionals(edge: GEdge, segments: Point[], context: RenderingContext): VNode[] {
//     const additionals = super.renderAdditionals(edge, segments, context);
//     const p1 = segments[segments.length - 2];
//     const p2 = segments[segments.length - 1];
//     const arrow = (
//         <path
//             class-sprotty-edge={true}
//             class-arrow={true}
//             d='M 1,0 L 10,-4 L 10,4 Z'
//             transform={`rotate(${toDegrees(angleOfPoint(Point.subtract(p1, p2)))} ${p2.x} ${p2.y}) translate(${p2.x} ${p2.y})`}
//         />
//     );
//     // console.log('arrow', arrow);
//     additionals.push(arrow);
//     return additionals;
//   }
// }
