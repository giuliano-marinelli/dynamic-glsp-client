// import {
//   GEdge,
//   Point,
//   PolylineEdgeViewWithGapsOnIntersections,
//   RenderingContext,
//   angleOfPoint,
//   toDegrees,
//   svg
// } from '@eclipse-glsp/client';
// import { injectable } from 'inversify';
// import { VNode } from 'snabbdom';

// const JSX = { createElement: svg };

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
