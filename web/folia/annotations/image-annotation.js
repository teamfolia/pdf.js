import { FOLIA_LAYER_ROLES } from "../folia-page-layer";
import FoliaBaseAnnotation from "./base-annotation";
import { ANNOTATION_TYPES } from "../constants";
import { toPdfRect, fromPdfRect } from "../folia-util";

class FoliaImageAnnotation extends FoliaBaseAnnotation {
  editablePropertiesList = [];
  image;
  imageSrc;
  fixedAspectRatio = true;

  constructor(...props) {
    super(...props);
    const image = document.createElement("img");
    image.setAttribute("data-id", `${this.id}`);
    image.setAttribute("data-role", FOLIA_LAYER_ROLES.ANNOTATION_OBJECT);
    image.classList.add("image-stamp");
    this.image = image;
    this.annotationDIV.appendChild(image);
    this.buildBaseCorners();
  }

  getRawData() {
    const viewRect = [
      this.annotationDIV.offsetLeft,
      this.annotationDIV.offsetTop,
      this.annotationDIV.clientWidth,
      this.annotationDIV.clientHeight,
    ];

    const rect = toPdfRect(viewRect, this.viewport.width, this.viewport.height);
    const {
      id,
      addedAt,
      collaboratorEmail,
      page,
      filename,
      content,
      deleted = false,
    } = this.annotationRawData;
    return {
      __typename: ANNOTATION_TYPES.IMAGE,
      id,
      addedAt: this.isDirty || addedAt,
      collaboratorEmail,
      page,
      rect,
      filename,
      content,
      deleted,
    };
  }
  async render() {
    const { width: viewportWidth, height: viewportHeight } = this.viewport;
    const [left, top, width, height] = fromPdfRect(
      this.annotationRawData.rect,
      viewportWidth,
      viewportHeight
    );
    this.annotationDIV.style.left = `${left}px`;
    this.annotationDIV.style.top = `${top}px`;
    this.annotationDIV.style.width = `${width}px`;
    this.annotationDIV.style.height = `${height}px`;
    this.image.src = `data:image/png;base64,${this.annotationRawData.content}`;
    this.draw();
  }
  async draw() {
    this.isDirty
      ? this.annotationDIV.classList.add("changed")
      : this.annotationDIV.classList.remove("changed");
  }
}

export default FoliaImageAnnotation;
