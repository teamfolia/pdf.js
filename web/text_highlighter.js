/* Copyright 2021 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { fromPdfRect } from "./folia/folia-util";

/** @typedef {import("./event_utils").EventBus} EventBus */
// eslint-disable-next-line max-len
/** @typedef {import("./pdf_find_controller").PDFFindController} PDFFindController */

/**
 * @typedef {Object} TextHighlighterOptions
 * @property {PDFFindController} findController
 * @property {EventBus} eventBus - The application event bus.
 * @property {number} pageIndex - The page index.
 */

/**
 * TextHighlighter handles highlighting matches from the FindController in
 * either the text layer or XFA layer depending on the type of document.
 */
class TextHighlighter {
  /**
   * @param {TextHighlighterOptions} options
   */
  constructor({ findController, eventBus, pageIndex, getTextLayerDiv }) {
    this.findController = findController;
    this.matches = [];
    this.eventBus = eventBus;
    this.pageIdx = pageIndex;
    this._onUpdateTextLayerMatches = null;
    this.textDivs = null;
    this.textContentItemsStr = null;
    this.enabled = false;
    this.getTextLayerDiv = getTextLayerDiv;
  }

  /**
   * Store two arrays that will map DOM nodes to text they should contain.
   * The arrays should be of equal length and the array element at each index
   * should correspond to the other. e.g.
   * `items[0] = "<span>Item 0</span>" and texts[0] = "Item 0";
   *
   * @param {Array<Node>} divs
   * @param {Array<string>} texts
   */
  setTextMapping(divs, texts) {
    this.textDivs = divs;
    this.textContentItemsStr = texts;
  }

  /**
   * Start listening for events to update the highlighter and check if there are
   * any current matches that need be highlighted.
   */
  enable() {
    if (!this.textDivs || !this.textContentItemsStr) {
      throw new Error("Text divs and strings have not been set.");
    }
    if (this.enabled) {
      throw new Error("TextHighlighter is already enabled.");
    }
    this.enabled = true;
    if (!this._onUpdateTextLayerMatches) {
      this._onUpdateTextLayerMatches = (evt) => {
        if (evt.pageIndex === this.pageIdx || evt.pageIndex === -1) {
          this._updateMatches();
        }
      };
      this.eventBus._on("updatetextlayermatches", this._onUpdateTextLayerMatches);
    }
    this._updateMatches();
  }

  disable() {
    if (!this.enabled) {
      return;
    }
    this.enabled = false;
    if (this._onUpdateTextLayerMatches) {
      this.eventBus._off("updatetextlayermatches", this._onUpdateTextLayerMatches);
      this._onUpdateTextLayerMatches = null;
    }
  }

  _convertMatches(matches, matchesLength) {
    // Early exit if there is nothing to convert.
    if (!matches) {
      return [];
    }
    const { textContentItemsStr } = this;

    let i = 0,
      iIndex = 0;
    const end = textContentItemsStr.length - 1;
    const result = [];
    const textLayerDiv = this.getTextLayerDiv();

    for (let m = 0, mm = matches.length; m < mm; m++) {
      // Calculate the start position.
      let matchIdx = matches[m];
      // console.log("_convertMatches", matchIdx);

      if (!Number.isInteger(matchIdx)) {
        if (!textLayerDiv) continue;
        const rect = fromPdfRect(matchIdx.rect, textLayerDiv.clientWidth, textLayerDiv.clientHeight);
        const foliaAnnotationAnchor = document.createElement("div");
        foliaAnnotationAnchor.style.left = rect[0] + "px";
        foliaAnnotationAnchor.style.top = rect[1] + "px";
        foliaAnnotationAnchor.style.width = rect[2] + "px";
        foliaAnnotationAnchor.style.height = rect[3] + "px";
        foliaAnnotationAnchor.setAttribute("id", matchIdx.id);
        foliaAnnotationAnchor.setAttribute("data-info", "searchable_annotation");
        foliaAnnotationAnchor.style.position = "absolute";
        // foliaAnnotationAnchor.style.backgroundColor = "rgba(250, 128, 95, 0.15)";
        // foliaAnnotationAnchor.style.borderBottom = "solid 2px #FA805F";
        textLayerDiv.appendChild(foliaAnnotationAnchor);
        result.push(foliaAnnotationAnchor);
        continue;
      } else {
        // Loop over the divIdxs.
        while (i !== end && matchIdx >= iIndex + textContentItemsStr[i].length) {
          iIndex += textContentItemsStr[i].length;
          i++;
        }

        if (i === textContentItemsStr.length) {
          console.error("Could not find a matching mapping");
        }

        const match = {
          begin: {
            divIdx: i,
            offset: matchIdx - iIndex,
          },
        };

        // Calculate the end position.
        matchIdx += matchesLength[m];

        // Somewhat the same array as above, but use > instead of >= to get
        // the end position right.
        while (i !== end && matchIdx > iIndex + textContentItemsStr[i].length) {
          iIndex += textContentItemsStr[i].length;
          i++;
        }

        match.end = {
          divIdx: i,
          offset: matchIdx - iIndex,
        };
        result.push(match);
      }
    }
    return result.sort((a, b) => {
      const elA = a instanceof HTMLElement ? a : this.textDivs[a.begin.divIdx];
      const elB = b instanceof HTMLElement ? b : this.textDivs[b.begin.divIdx];
      return elA.offsetTop - elB.offsetTop;
    });
  }

  _renderMatches(matches) {
    // Early exit if there is nothing to render.
    if (matches.length === 0) {
      return;
    }
    const { findController, pageIdx } = this;
    const { textContentItemsStr, textDivs } = this;

    const isSelectedPage = pageIdx === findController.selected.pageIdx;
    const selectedMatchIdx = findController.selected.matchIdx;
    const highlightAll = findController.state.highlightAll;
    let prevEnd = null;
    const infinity = {
      divIdx: -1,
      offset: undefined,
    };

    function beginText(begin, className) {
      const divIdx = begin.divIdx;
      textDivs[divIdx].textContent = "";
      return appendTextToDiv(divIdx, 0, begin.offset, className);
    }

    function appendTextToDiv(divIdx, fromOffset, toOffset, className) {
      let div = textDivs[divIdx];
      if (div.nodeType === Node.TEXT_NODE) {
        const span = document.createElement("span");
        div.before(span);
        span.append(div);
        textDivs[divIdx] = span;
        div = span;
      }
      const content = textContentItemsStr[divIdx].substring(fromOffset, toOffset);
      const node = document.createTextNode(content);
      if (className) {
        const span = document.createElement("span");
        span.className = `${className} appended`;
        span.append(node);
        div.append(span);
        return className.includes("selected") ? span.offsetLeft : 0;
      }
      div.append(node);
      return 0;
    }

    let i0 = selectedMatchIdx,
      i1 = i0 + 1;
    if (highlightAll) {
      i0 = 0;
      i1 = matches.length;
    } else if (!isSelectedPage) {
      // Not highlighting all and this isn't the selected page, so do nothing.
      return;
    }

    console.log("_renderMatches", pageIdx, matches);
    for (let i = i0; i < i1; i++) {
      const match = matches[i];
      const begin = match.begin;
      const end = match.end;
      const isSelected = isSelectedPage && i === selectedMatchIdx;
      const highlightSuffix = isSelected ? " selected" : "";
      let selectedLeft = 0;

      const isFoliaAnnotation = !(match.hasOwnProperty("begin") && match.hasOwnProperty("end"));
      if (isFoliaAnnotation) {
        // match.style.borderBottom = isSelected ? "none" : "solid 2px #FA805F";
        match.style.backgroundColor = isSelected ? "rgba(250, 128, 95, 1)" : "transparent";
      } else {
        // Match inside new div.
        if (!prevEnd || begin.divIdx !== prevEnd.divIdx) {
          // If there was a previous div, then add the text at the end.
          if (prevEnd !== null) {
            appendTextToDiv(prevEnd.divIdx, prevEnd.offset, infinity.offset);
          }
          // Clear the divs and set the content until the starting point.
          beginText(begin);
        } else {
          appendTextToDiv(prevEnd.divIdx, prevEnd.offset, begin.offset);
        }

        if (begin.divIdx === end.divIdx) {
          selectedLeft = appendTextToDiv(
            begin.divIdx,
            begin.offset,
            end.offset,
            "highlight" + highlightSuffix
          );
        } else {
          selectedLeft = appendTextToDiv(
            begin.divIdx,
            begin.offset,
            infinity.offset,
            "highlight begin" + highlightSuffix
          );
          for (let n0 = begin.divIdx + 1, n1 = end.divIdx; n0 < n1; n0++) {
            textDivs[n0].className = "highlight middle" + highlightSuffix;
          }
          beginText(end, "highlight end" + highlightSuffix);
        }
        prevEnd = end;
      }

      // if (isFoliaAnnotation) {
      //   // console.log("_renderMatches", match);
      //   const textLayerDiv = this.getTextLayerDiv();
      //   if (false) {
      //     const rect = fromPdfRect(matchIdx.rect, textLayerDiv.clientWidth, textLayerDiv.clientHeight);
      //     const annoDiv = document.createElement("div");
      //     annoDiv.style.left = rect[0] + "px";
      //     annoDiv.style.top = rect[1] + "px";
      //     annoDiv.style.width = rect[2] + "px";
      //     annoDiv.style.height = rect[3] + "px";
      //     annoDiv.setAttribute("id", matchIdx.id);
      //     annoDiv.setAttribute("data-info", "searchable_annotation");
      //     annoDiv.style.position = "absolute";
      //     // annoDiv.style.backgroundColor = "rgba(250, 128, 95, 0.15)";
      //     // annoDiv.style.borderBottom = "solid 2px #FA805F";
      //     textLayerDiv.appendChild(annoDiv);
      //     result.push(annoDiv);
      //   }

      //   // match.style.borderBottom = isSelected ? "none" : "solid 2px #FA805F";
      //   // match.style.backgroundColor = isSelected ? "rgba(250, 128, 95, 1)" : "transparent";
      // }

      if (isSelected) {
        // Attempt to scroll the selected match into view.
        findController.scrollMatchIntoView({
          element: isFoliaAnnotation ? match : textDivs[begin.divIdx],
          selectedLeft,
          pageIndex: pageIdx,
          matchIndex: selectedMatchIdx,
        });
      }
    }

    if (prevEnd) {
      appendTextToDiv(prevEnd.divIdx, prevEnd.offset, infinity.offset);
    }
  }

  _updateMatches() {
    if (!this.enabled) {
      return;
    }
    const { findController, matches, pageIdx } = this;
    const { textContentItemsStr, textDivs } = this;
    let clearedUntilDivIdx = -1;

    // Clear all current matches.
    const textLayerDiv = this.getTextLayerDiv();
    if (textLayerDiv) {
      const annoDivs = textLayerDiv.querySelectorAll('div[data-info="searchable_annotation"]');
      annoDivs.forEach((el) => el.remove());
    }
    for (const match of matches) {
      console.log("_updateMatches", match);
      const isFoliaAnnotation = !(match.hasOwnProperty("begin") && match.hasOwnProperty("end"));
      if (isFoliaAnnotation) continue;

      const begin = Math.max(clearedUntilDivIdx, match.begin.divIdx);
      for (let n = begin, end = match.end.divIdx; n <= end; n++) {
        const div = textDivs[n];
        div.textContent = textContentItemsStr[n];
        div.className = "";
      }
      clearedUntilDivIdx = match.end.divIdx + 1;
    }

    if (!findController?.highlightMatches) {
      return;
    }
    // Convert the matches on the `findController` into the match format
    // used for the textLayer.
    const pageMatches = findController.pageMatches[pageIdx] || null;
    const pageMatchesLength = findController.pageMatchesLength[pageIdx] || null;

    this.matches = this._convertMatches(pageMatches, pageMatchesLength);
    // console.log("_updateMatches", pageIdx, this.matches);
    this._renderMatches(this.matches);
  }
}

export { TextHighlighter };
