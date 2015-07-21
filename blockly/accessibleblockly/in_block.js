'use strict';

/**
*Copyright 2015 Luna Meier
*
*Licensed under the Apache License, Version 2.0 (the "License");
*you may not use this file except in compliance with the License.
*You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
*Unless required by applicable law or agreed to in writing, software
*distributed under the License is distributed on an "AS IS" BASIS,
*WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*See the License for the specific language governing permissions and
*limitations under the License.
*/

/**
 * @fileoverview Provides ability to navigate within a block in order to access inner blocks and fields.
 * @author lunalovecraft@gmail.com (Luna Meier)
 */

goog.provide('Blockly.Accessibility.InBlock');

goog.require('Blockly.Accessibility.Navigation');
goog.require('Blockly.Accessibility');

Blockly.Accessibility.InBlock.storedConnection = null;

/**
 * Contains the array that describes whether the selected block has values, fields, or statements.
 */
Blockly.Accessibility.InBlock.selectionList = [];

/**
 * Contains the index of the currently selected value, field, or statement
 */
Blockly.Accessibility.InBlock.connectionsIndex = 0;

/**
 * Initializes all the information necessary to access a block. 
 * Creates selectionList, which can be navigated to deal with the block
 * @return {bool} Returns true if success, returns false if failure to enter block
 */
Blockly.Accessibility.InBlock.enterCurrentBlock = function () {

    if (!Blockly.selected) {
        return false;
    }

    if (this.selectionList != []) {
        this.unhighlightSelection();
    }

    // Check the bottom and top connections and only add them to the list if it's meaningful to do so.
    this.selectionList = [];
    if (Blockly.selected.nextConnection != null) {
        this.selectionList.push('bottomConnection');
    }

    if (Blockly.selected.previousConnection != null) {
        this.selectionList.push('topConnection');
    }

    // Go through all of the inputs for the current block and see what you can add where
    for (var i = 0; i < Blockly.selected.inputList.length; i++) {
        if (Blockly.selected.inputList[i].fieldRow.length > 0) {
            // Check all of the fields
            for (var j = 0; j < Blockly.selected.inputList[i].fieldRow.length; j++) {
                if (!(Blockly.selected.inputList[i].fieldRow[j] instanceof Blockly.FieldLabel) &&
                    !(Blockly.selected.inputList[i].fieldRow[j] instanceof Blockly.FieldImage)) {
                    this.selectionList.push(Blockly.selected.inputList[i].fieldRow[j]);
                }
            }
        }
        // If the connection is null it means nothing can be connected there, so we don't need to remember the input
        if (Blockly.selected.inputList[i].connection != null) {
            this.selectionList.push(Blockly.selected.inputList[i]);
        }
    }

    if (this.selectionList.length == 0) {
        return false;
    }

    this.connectionsIndex = 0;

    console.log(this.selectionList[this.connectionsIndex]);

    this.highlightSelection();

    return true;
};

/**
 * Selects the next value or field within the current block
 */
Blockly.Accessibility.InBlock.selectNext = function () {
    this.unhighlightSelection();

    this.connectionsIndex++;
    if (this.connectionsIndex >= this.selectionList.length) {
        this.connectionsIndex = 0;
    }

    console.log(this.selectionList[this.connectionsIndex]);

    this.highlightSelection();
};

/**
 * Selects the previous value or field within the current block
 */
Blockly.Accessibility.InBlock.selectPrev = function () {
    this.unhighlightSelection();

    this.connectionsIndex--;
    if (this.connectionsIndex < 0) {
        this.connectionsIndex = this.selectionList.length - 1;
    }

    console.log(this.selectionList[this.connectionsIndex]);

    this.highlightSelection();
};

/**
 * Selects the current field if a field is selected, or selects
 * the current block if a value or statement is selected
 */
Blockly.Accessibility.InBlock.enterSelected = function () {

    this.clearHighlights();

    //See INNER_ACTION_FUNCTIONS region below for functions
    if (this.selectionList[this.connectionsIndex] === 'bottomConnection') {
        this.bottomConnection();
    }
    else if (this.selectionList[this.connectionsIndex] === 'topConnection') {
        this.topConnection();
    }
    else if (this.selectionList[this.connectionsIndex] instanceof Blockly.Input) {
        this.input();
    }
    else if (this.selectionList[this.connectionsIndex] instanceof Blockly.FieldDropdown) {
        this.dropDown();
    }
    else if (this.selectionList[this.connectionsIndex] instanceof Blockly.FieldTextInput) {
        this.textInput();
    }
    else if (this.selectionList[this.connectionsIndex] instanceof Blockly.FieldColour) {
        this.colour();
    }
    else if (this.selectionList[this.connectionsIndex] instanceof Blockly.FieldCheckbox) {
        this.checkbox();
    }
    else if (this.selectionList[this.connectionsIndex] instanceof Blockly.FieldDate) {
        this.date();
    }
    else if (this.selectionList[this.connectionsIndex] instanceof Blockly.FieldVariable) {
        this.variable();
    }


};

/**
 * Stores a connection that you will be connecting to, or if a
 * connection is already stored then it connects the two connections.
 */
Blockly.Accessibility.InBlock.selectConnection = function () {

    var relevantConnection = null;

    // First find which case we're dealing with, and get the relevant connection for the case
    if (this.selectionList[this.connectionsIndex] === 'bottomConnection') {
        relevantConnection = Blockly.selected.nextConnection;
    }
    else if (this.selectionList[this.connectionsIndex] === 'topConnection') {
        relevantConnection = Blockly.selected.previousConnection;
    }
    else if (this.selectionList[this.connectionsIndex] instanceof Blockly.Input) {
        relevantConnection = this.selectionList[this.connectionsIndex].connection;
    }

    // If we don't have a sotred connection, then store one.  Otherwise connect the things.
    if (this.storedConnection == null) {
        this.storedConnection = relevantConnection;
        console.log('storing');
        this.selectionList = [];
        this.storedHighlight = this.storedConnection.returnHighlight();
    }
    else {
        console.log('connecting');
        this.storedConnection.unhighlight();
        try {
            this.unhighlightSelection();
            this.storedConnection.connect(relevantConnection);
        }
        catch (e) { console.log(e);}
        finally {
            Blockly.Connection.removeHighlight(this.storedHighlight);
            this.storedHighlight = null;
            this.storedConnection = null;
        }
    }
}

/**
 * Highlights the currently selected input
 */
Blockly.Accessibility.InBlock.highlightSelection = function(){
    //See INNER_ACTION_FUNCTIONS region below for functions
    if (this.selectionList[this.connectionsIndex] === 'bottomConnection') {
        this.highlightList.push(Blockly.selected.nextConnection.returnHighlight());
    }
    else if (this.selectionList[this.connectionsIndex] === 'topConnection') {
        this.highlightList.push(Blockly.selected.previousConnection.returnHighlight());
    }
    else if (this.selectionList[this.connectionsIndex] instanceof Blockly.Input) {
        this.highlightList.push(this.selectionList[this.connectionsIndex].connection.returnHighlight());
    }
}

/**
 * Unhighlights the currently selected input
 */
Blockly.Accessibility.InBlock.unhighlightSelection = function () {
    this.clearHighlights();
}

/**
 * If a value or statement is selected, add a block to it.
 */
Blockly.Accessibility.InBlock.addBlock = function () {

};


/**
 * All of the following are separated so that they can be described as hooks
 */

//#region INNER_ACTION_FUNCTIONS

/**
 * Enters the bottom connection of the selected block
 */
Blockly.Accessibility.InBlock.bottomConnection = function () {
    // This behaviour is essentially just traversing down, so do that.
    Blockly.Accessibility.Navigation.traverseDown();
};

/**
 * Enters the top connection of the selected block
 */
Blockly.Accessibility.InBlock.topConnection = function () {
    // This behaviour is essentially just traversing up, so do that.
    Blockly.Accessibility.Navigation.traverseUp();
};

/**
 * Enters the currently selected block if the input isn't null
 */
Blockly.Accessibility.InBlock.input = function () {
    if (this.selectionList[this.connectionsIndex].connection.targetConnection != null) {
        // Find the block that's connected to this input and jump to it
        Blockly.Accessibility.Navigation.jumpToID(
            this.selectionList[this.connectionsIndex].connection.targetConnection.sourceBlock_.id);
    }
};

/**
 * Allows the user to edit the selected dropDownMenu
 */
Blockly.Accessibility.InBlock.dropDown = function () {
    // Sorta complete, no way to select a specific option yet without arrow keys
    this.selectionList[this.connectionsIndex].showEditor_();
};

/**
 * Allows the user to edit the selected textInput
 */
Blockly.Accessibility.InBlock.textInput = function () {

    this.selectionList[this.connectionsIndex].showEditor_();
};

/**
 * Allows the user to choose a colour in the selected colour input
 */
Blockly.Accessibility.InBlock.colour = function () {
    
    this.selectionList[this.connectionsIndex].showEditor_();
};

/**
 * Allows the user to check the check of the currently selected checkbox
 */
Blockly.Accessibility.InBlock.checkbox = function () {
    //Toggles the checkbox
    this.selectionList[this.connectionsIndex].showEditor_();
};

/**
 * Allows the user to edit the date of the currently selected date input
 */
Blockly.Accessibility.InBlock.date = function () {
    // Not fully implemented yet
    this.selectionList[this.connectionsIndex].showEditor_();
};

/**
 * Allows the user to edit the variable of the currently selected variable input
 */
Blockly.Accessibility.InBlock.variable = function () {
    // Sorta works, uses arrow keys at the moment.
    this.selectionList[this.connectionsIndex].showEditor_();
};

// We need to change the way highlighting works if we want to store our own highlights
//#region HIGHLIGHT_CODE

/**
 * Stores all highlights in the scene.
 */
Blockly.Accessibility.InBlock.highlightList = [];

/**
 * Stores a specific highlight for use in connections/additions
 */
Blockly.Accessibility.InBlock.storedHighlight = null;

/**
 * Add highlighting around this connection.
 * @return {svgElement} The highlight that is produced
 */
Blockly.Connection.prototype.returnHighlight = function () {
    var steps;
    if (this.type == Blockly.INPUT_VALUE || this.type == Blockly.OUTPUT_VALUE) {
        var tabWidth = this.sourceBlock_.RTL ? -Blockly.BlockSvg.TAB_WIDTH :
            Blockly.BlockSvg.TAB_WIDTH;
        steps = 'm 0,0 v 5 c 0,10 ' + -tabWidth + ',-8 ' + -tabWidth + ',7.5 s ' +
                tabWidth + ',-2.5 ' + tabWidth + ',7.5 v 5';
    } else {
        if (this.sourceBlock_.RTL) {
            steps = 'm 20,0 h -5 ' + Blockly.BlockSvg.NOTCH_PATH_RIGHT + ' h -5';
        } else {
            steps = 'm -20,0 h 5 ' + Blockly.BlockSvg.NOTCH_PATH_LEFT + ' h 5';
        }
    }
    var xy = this.sourceBlock_.getRelativeToSurfaceXY();
    var x = this.x_ - xy.x;
    var y = this.y_ - xy.y;
    return Blockly.createSvgElement('path',
        {
            'class': 'blocklyHighlightedConnectionPath',
            'd': steps,
            transform: 'translate(' + x + ', ' + y + ')'
        },
        this.sourceBlock_.getSvgRoot());
};

/**
 * Remove the highlighting around the passed in connection.
 * @param {svgElement} Highlighting to be removed
 */
Blockly.Connection.removeHighlight = function (highlight) {
    goog.dom.removeNode(highlight);
};

/**
 * Clears all highlights from the scene that are not part of the separate storage
 */
Blockly.Accessibility.InBlock.clearHighlights = function () {
    for (var i = 0; i < this.highlightList.length; i++) {
        Blockly.Connection.removeHighlight(this.highlightList[i])
    }
    this.highlightList = [];
};

//#endregion