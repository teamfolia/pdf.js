import { FOLIA_LAYER_ROLES } from "../folia-page-layer";
import FoliaBaseAnnotation from "./base-annotation";
import { ANNOTATION_TYPES } from "../constants";
import { toPdfRect, fromPdfRect, fromPdfPoint, toPdfPoint } from "../folia-util";
import FoliaComment from "../web-components/folia-comment";
import FoliaCreateComment from "../web-components/folia-create-comment";
import { v4 as uuid } from "uuid";

class FoliaCommentAnnotation extends FoliaBaseAnnotation {
  editablePropertiesList = ["text"];

  constructor(...props) {
    super(...props);
    this.annotationDIV.classList.add("comment-pointer");
    this.drawAvatar();
    const observer = new MutationObserver((mutations) =>
      this.commentAnnotationElementMutaionCallback(mutations)
    );
    observer.observe(this.annotationDIV, { attributes: true });
  }

  getRawData() {
    const { id, createdAt, addedAt, deletedAt, collaboratorEmail, page, anchorPoint, text } =
      this.annotationRawData;
    return {
      __typename: ANNOTATION_TYPES.COMMENT,
      id,
      createdAt,
      addedAt: this.isDirty || addedAt,
      deletedAt,
      collaboratorEmail,
      page,
      anchorPoint,
    };
  }

  updateRects() {
    const point = {
      x: this.annotationDIV.offsetLeft,
      y: this.annotationDIV.offsetTop,
    };
    this.annotationRawData.anchorPoint = toPdfPoint(point, this.viewport.width, this.viewport.height);
    this.render();
  }

  update(annotationRawData, viewport, force = false) {
    super.update(annotationRawData, viewport, force);
    // console.log("afer update", this.annotationRawData);
    const commentEl = this.annotationDIV.querySelector("folia-comment");
    if (commentEl) {
      // commentEl.initialComment = this.annotationRawData;
      commentEl.replies = this.annotationRawData.replies.slice();
      commentEl.permissions = {
        permissions: this.annotationRawData.permissions,
        userEmail: this.dataProxy.userEmail,
        userRole: this.annotationRawData.userRole,
      };
    }
  }

  render() {
    // console.log("comment render", this.annotationRawData);
    const { width: viewportWidth, height: viewportHeight } = this.viewport;
    const { x, y } = fromPdfPoint(this.annotationRawData.anchorPoint, viewportWidth, viewportHeight);
    this.annotationDIV.style.left = `${x}px`;
    this.annotationDIV.style.top = `${y}px`;
    this.drawAvatar();
  }

  drawAvatar() {
    const avatar = document.createElement("canvas");
    avatar.width = 20;
    avatar.height = 20;
    const avatarCtx = avatar.getContext("2d");
    avatarCtx.fillStyle = "lightgreen";
    avatarCtx.arc(10, 10, 10, 0, 2 * Math.PI);
    avatarCtx.fill();

    // console.log("draw comment avatar", this.annotationRawData.replies);
    const repliesNumber = this.annotationRawData.replies.length;
    const text = repliesNumber === 0 ? "" : repliesNumber > 10 ? "10+" : repliesNumber;
    avatarCtx.font = "lighter 11px sans-serif";
    avatarCtx.fillStyle = "black";
    const textRect = avatarCtx.measureText(text);
    avatarCtx.fillText(text, avatar.width / 2 - textRect.width / 2, 14, 20);

    this.annotationDIV.style.background = `white url("${avatar.toDataURL()}") no-repeat center`;
    this.annotationDIV.classList.toggle(
      "error",
      Boolean(this.annotationRawData.error) ||
        this.annotationRawData.replies.some((reply) => Boolean(reply.error))
    );
  }

  commentAnnotationElementMutaionCallback(mutations) {
    // here we observe <selected> class of this.annotationDIV
    const isThisTarget = mutations.some((mutation) => mutation.target === this.annotationDIV);
    if (!isThisTarget) return;

    mutations.forEach((mutation) => {
      if (mutation.type !== "attributes" || mutation.attributeName !== "class") return;
      const selected = mutation.target.classList.contains("selected");
      if (selected) {
        const comment = this.__comment || document.createElement("folia-comment");
        comment.replies = this.annotationRawData.replies.slice();
        comment.permissions = {
          permissions: this.annotationRawData.permissions,
          userEmail: this.dataProxy.userEmail,
          userRole: this.annotationRawData.userRole,
        };

        comment.addEventListener("submit-comment", (e) => {
          return console.error("submit-comment", e);
          const addedAt = new Date().toISOString();
          const annotationData = {
            ...this.annotationRawData,
            addedAt,
            status: "EDITED",
            text: e.detail.text,
          };
          // console.log("submit-comment", e.detail, annotationData);
          this.foliaPageLayer.commitObjectChanges(annotationData);
          // this.foliaPageLayer.eventBus.dispatch("stop-drawing");
        });

        comment.addEventListener("submit-replay", (e) => {
          const now = new Date().toISOString();
          let annotationData = null;
          if (!e.detail.id) {
            annotationData = {
              __typename: ANNOTATION_TYPES.REPLY,
              id: uuid(),
              addedAt: now,
              createdAt: now,
              collaboratorEmail: this.dataProxy.userEmail,
              collaboratorName: this.dataProxy.userName,
              commentId: this.annotationRawData.id,
              page: this.annotationRawData.page,
              status: "NOT_EDITED",
              text: e.detail.text,
            };
            this.annotationRawData.replies = this.annotationRawData.replies.concat(annotationData);
            comment.replies = this.annotationRawData.replies;
            // console.log("submit-replay new", { detail: e.detail, annotationData });
          } else {
            const replyData = this.annotationRawData.replies.find((reply) => reply.id === e.detail.id);
            annotationData = {
              ...replyData,
              status: replyData?.edited || e.detail.edited ? "EDITED" : "NOT_EDITED",
              addedAt: now,
              text: e.detail.text,
            };
            // console.log("submit-replay edit", { detail: e.detail, annotationData });
          }
          this.foliaPageLayer.commitObjectChanges(annotationData);
          this.drawAvatar();
        });

        comment.addEventListener("close", () => {
          this.foliaPageLayer.multipleSelect.clear();
          if (this.__comment) this.__comment.remove();
        });

        comment.addEventListener("remove", (e) => {
          // console.log("remove object", e.detail, this);
          const { commentId, replyId } = e.detail;
          if (commentId) {
            this.foliaPageLayer.deleteSelectedAnnotations(this);
          } else if (replyId) {
            const deletedAt = new Date().toISOString();
            this.foliaPageLayer.commitObjectChanges({ deletedAt, id: replyId });
            this.annotationRawData.replies = this.annotationRawData.replies.filter((reply) => {
              return reply.id !== replyId;
            });
            this.drawAvatar();
          }
        });

        this.__comment = this.annotationDIV.appendChild(comment);
      } else {
        if (this.__comment) this.__comment.remove();
        this.__comment = null;
      }
    });
  }
}

export default FoliaCommentAnnotation;
