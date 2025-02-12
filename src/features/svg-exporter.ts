import { GLSPSvgExporter } from '@eclipse-glsp/client';

export class SvgExporter extends GLSPSvgExporter {
  getSvg(): string | undefined {
    if (typeof document == 'undefined') {
      this.log.warn(this, `Document is not available. Cannot export SVG.`);
      return;
    }

    const serializer = new XMLSerializer();
    return serializer.serializeToString(this.createSvgElement());
  }

  protected findBaseSvgElement(): SVGSVGElement | null {
    const div = document.getElementById(this.options.baseDiv);
    return div && div.querySelector('svg');
  }

  protected createSvgElement(): SVGSVGElement {
    // get the base svg element
    const svgBase = this.findBaseSvgElement() as SVGSVGElement;

    // copy svg base into a temporal div
    const div = document.createElement('div');
    div.innerHTML = svgBase.outerHTML;

    // get the svg element from the div
    const svgElement = div.querySelector('svg') as SVGSVGElement;

    // find all elements inside the svg element that have selected class and remove that class from them
    const selectedElements = svgElement.querySelectorAll('.selected');
    selectedElements.forEach((element) => element.classList.remove('selected'));

    // remove inline styles of the svg element
    svgElement.removeAttribute('style');

    // remove opacity attribute
    svgElement.removeAttribute('opacity');

    // get the content of the svg element
    const svgContent = svgElement.getElementsByTagName('g')[0];

    // update the width and height of the svg element to fit the content
    // using svgBase content to get the bounding box
    const svgBaseContent = svgBase.getElementsByTagName('g')[0];
    const bbox = svgBaseContent.getBBox();

    // position the content of the svg element at the top left corner
    svgContent.setAttribute('transform', `scale(1) translate(${4 - bbox.x},${4 - bbox.y})`);

    svgElement.setAttribute('width', `${bbox.width + 8}`);
    svgElement.setAttribute('height', `${bbox.height + 8}`);

    // remove the temporal div
    div.remove();

    return svgElement;
  }
}
