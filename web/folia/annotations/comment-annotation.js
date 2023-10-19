import { FOLIA_LAYER_ROLES } from "../folia-page-layer";
import FoliaBaseAnnotation from "./base-annotation";
import { ANNOTATION_TYPES, PERMISSIONS, USER_ROLE } from "../constants";
import { toPdfRect, fromPdfRect, fromPdfPoint, toPdfPoint, getInitials } from "../folia-util";
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
    observer.observe(this.annotationDIV, { childList: true });

    this.submitReplyBinded = this.submitReply.bind(this);
    this.closeBinded = this.close.bind(this);
    this.removeBinded = this.remove.bind(this);
    this.changeReadStatusBinded = this.changeReadStatus.bind(this);
    this.setAllRepliesAsUnreadBinded = this.setAllRepliesAsUnread.bind(this);
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
    if (this.__comment) {
      this.setAllRepliesAsRead();
      this.__comment.replies = this.annotationRawData.replies.slice();
      this.__comment.permissions = this.annotationRawData.permissions;
      this.__comment.currentUserEmail = this.dataProxy.userEmail;
      this.__comment.collaboratorEmail = this.annotationRawData.collaboratorEmail;
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
    avatar.width = 100;
    avatar.height = 100;
    const avatarCtx = avatar.getContext("2d");
    avatarCtx.fillStyle = "lightgreen";
    avatarCtx.arc(50, 50, 43, 0, 2 * Math.PI);
    avatarCtx.fill();

    const { collaboratorName, collaboratorEmail } = this.annotationRawData;
    const userInitials = getInitials(collaboratorName || collaboratorEmail);

    const repliesNumber = this.annotationRawData.replies.length;
    const text = userInitials;
    // const text = repliesNumber === 0 ? "" : repliesNumber > 10 ? "10+" : repliesNumber;
    avatarCtx.font = "36px sans-serif";
    avatarCtx.fillStyle = "black";
    const textRect = avatarCtx.measureText(text);
    avatarCtx.fillText(text, avatar.width / 2 - textRect.width / 2, 62);

    this.annotationDIV.style.backgroundSize = "contain";
    this.annotationDIV.style.backgroundColor = "white";
    this.annotationDIV.style.backgroundRepeat = "no-repeat";
    this.annotationDIV.style.backgroundPosition = "center";
    this.annotationDIV.style.backgroundImage = `url("${avatar.toDataURL()}")`;
    this.annotationDIV.classList.toggle(
      "error",
      Boolean(this.annotationRawData.error) ||
        this.annotationRawData.replies.some((reply) => Boolean(reply.error))
    );
    const isUnread = this.annotationRawData.replies.some((reply) => !reply.isRead);
    this.annotationDIV.classList.toggle("unread", isUnread);
  }

  commentAnnotationElementMutaionCallback(mutations) {
    // here we observe <selected> class of this.annotationDIV
    mutations.forEach((mutation) => {
      if (mutation.target !== this.annotationDIV) return;
      const stepanAdded = Array.from(mutation.addedNodes).some((el) => el.classList.contains("stepan"));
      const stepanRemoved = Array.from(mutation.removedNodes).some((el) => el.classList.contains("stepan"));
      if (stepanAdded) {
        console.log("set replies & permissions here.");
        this.setAllRepliesAsRead();

        this.__comment = document.createElement("folia-comment");
        this.__comment.addEventListener("submit-replay", this.submitReplyBinded);
        this.__comment.addEventListener("close", this.closeBinded);
        this.__comment.addEventListener("remove", this.removeBinded);
        this.__comment.addEventListener("change-read-status", this.changeReadStatusBinded);
        this.__comment.addEventListener("mark-all-as-unread", this.setAllRepliesAsUnreadBinded);

        this.__comment.currentUserEmail = this.dataProxy.userEmail;
        this.__comment.collaboratorEmail = this.annotationRawData.collaboratorEmail;
        this.__comment.replies = this.annotationRawData.replies;
        this.__comment.permissions = this.annotationRawData.permissions;
        this.annotationDIV.appendChild(this.__comment);
        // if (this.annotationDIV.querySelectorAll("folia-comment").length === 0) {
        // }
      } else if (stepanRemoved) {
        // console.log("remove folia-comment");
        if (this.__comment) {
          this.__comment.removeEventListener("submit-replay", this.submitReplyBinded);
          this.__comment.removeEventListener("close", this.closeBinded);
          this.__comment.removeEventListener("remove", this.removeBinded);
          this.__comment.removeEventListener("change-read-status", this.changeReadStatusBinded);
          this.__comment.removeEventListener("mark-all-as-unread", this.setAllRepliesAsReadBinded);
          this.__comment.remove();
          this.__comment = null;
        }
      }
    });
  }

  submitReply(e) {
    const addedAt = e.detail.addedAt || new Date().toISOString();

    if (!e.detail.id) {
      const id = uuid();
      const annotationData = {
        __typename: ANNOTATION_TYPES.REPLY,
        id,
        addedAt: addedAt,
        createdAt: addedAt,
        collaboratorEmail: this.dataProxy.userEmail,
        collaboratorName: this.dataProxy.userName,
        commentId: this.annotationRawData.id,
        page: this.annotationRawData.page,
        status: "NOT_EDITED",
        text: e.detail.text,
        isRead: true,
      };
      this.annotationRawData.replies = this.annotationRawData.replies.concat(annotationData);
      this.__comment.replies = this.annotationRawData.replies;
      // console.log("submit-replay new", { detail: e.detail, annotationData });
      this.foliaPageLayer.commitObjectChanges(annotationData);
      // this.changeReadStatus({ detail: { replyId: id, isRead: true } });
    } else {
      const replyData = this.annotationRawData.replies.find((reply) => reply.id === e.detail.id);
      replyData.status = replyData?.edited || e.detail.edited ? "EDITED" : "NOT_EDITED";
      replyData.addedAt = addedAt;
      replyData.text = e.detail.text;
      // console.log("submit-replay edit", { detail: e.detail, replyData });
      this.foliaPageLayer.commitObjectChanges(replyData);
    }
  }

  close(e) {
    this.foliaPageLayer.multipleSelect.clear();
    if (this.__comment) this.__comment.remove();
  }

  remove(e) {
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
  }

  changeReadStatus(e) {
    const { replyId, isRead } = e.detail;
    // console.log("annot::send to viewer", replyId, isRead);
    const addedAt = new Date().toISOString();
    this.foliaPageLayer.eventBus.dispatch("set-replies-read-status", [{ replyId, isRead, addedAt }]);
    const reply = this.annotationRawData.replies.find((reply) => reply.id === replyId);
    if (reply) reply.isRead = isRead;

    this.drawAvatar();
  }

  setAllRepliesAsRead() {
    this.changeAllReadStatuses(true);
  }
  setAllRepliesAsUnread() {
    this.changeAllReadStatuses(false);
    if (this.__comment) {
      this.__comment.replies = this.annotationRawData.replies;
    }
  }

  changeAllReadStatuses(isRead = true) {
    const now = new Date().toISOString();
    const statuses = this.annotationRawData.replies
      .filter((r) => r.isRead !== isRead)
      .map((r) => ({
        replyId: r.id,
        isRead: isRead,
        addedAt: now,
      }));
    // console.log("changeAllReadStatuses as", isRead, statuses);

    if (statuses.length > 0) {
      this.foliaPageLayer.eventBus.dispatch("set-replies-read-status", statuses);
      this.annotationRawData.replies.forEach((reply) => {
        const status = statuses.find((status) => reply.id === status.replyId);
        if (status) {
          reply.isRead = status.isRead;
        }
      });
    }
    this.drawAvatar();
  }

  get canManage() {
    const isCommentOwner =
      this.foliaPageLayer.dataProxy.userEmail === this.annotationRawData.collaboratorEmail;
    const { permissions } = this.foliaPageLayer.dataProxy;
    return isCommentOwner && permissions.includes(PERMISSIONS.MANAGE_OWN_COMMENT);
  }
}

export default FoliaCommentAnnotation;
