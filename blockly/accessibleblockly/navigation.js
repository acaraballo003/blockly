'use strict';

/**
*Copyright 2015 Luna Meier, Rachael Bosley
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
 * @fileoverview Core navigation library for Accessible Blockly Plugin.
 * Allows for traversal around blocks, as well as keeping things up to date.
 */

goog.provide('Blockly.Accessibility.Navigation');

goog.require('Blockly.Accessibility.Speech');
goog.require('Blockly.Accessibility');


/**
 * The xml dom that describes the current scene in the Blockly workspace
 */
var xmlDoc = null;

/**
 * The current node that is selected in Blockly.
 */
Blockly.Accessibility.Navigation.currentNode = null;

/**
 * If this variable is true then updateXmlSelection will skip.
 * Use in cases where the updating will be problematic
 */
Blockly.Accessibility.Navigation.disableUpdate = false;

/**
 * The stack holding all of the previous iterations of the workspace
 */
Blockly.Accessibility.Navigation.undoStack = [];

/**
 * Temporary storage of future scenes if undo is used.
 * On scene change this stack empties.
 */
Blockly.Accessibility.Navigation.redoStack = [];
/**
* Temporary storage for navigating within a statements children
*/
Blockly.Accessibility.Navigation.statementChildren = [];
//#region XML_UPDATING

//Count for traversing inline blocks
Blockly.Accessibility.Navigation.inlineCount = 0;

// Default functions for our hooks.
Blockly.BlockSvg.prototype.defaultSelect = Blockly.BlockSvg.prototype.select;
Blockly.BlockSvg.prototype.defaultUnselect = Blockly.BlockSvg.prototype.unselect
Blockly.BlockSvg.prototype.defaultDispose = Blockly.BlockSvg.prototype.dispose;

/**
 * Select this block.  Highlight it visually.
 */
Blockly.BlockSvg.prototype.select = function () {
    this.defaultSelect();
    console.log(Blockly.selected);

    if (Blockly.Accessibility.Navigation.getBlockNodeById(this.id)) {
        Blockly.Accessibility.Navigation.currentNode = Blockly.Accessibility.Navigation.getBlockNodeById(this.id);
    }

    Blockly.Accessibility.Speech.updateBlockReader(this.type, this);
    Blockly.Accessibility.Speech.changedResult = undefined;

};

/**
 * Unselect this block.  Remove its highlighting.
 */
Blockly.BlockSvg.prototype.unselect = function () {

    this.defaultUnselect();
    Blockly.ContextMenu.hide();
    Blockly.WidgetDiv.hide();

    Blockly.Accessibility.Navigation.currentNode = null;
    Blockly.Accessibility.Speech.changedSelect = true;
    // Handle if you're leaving edit mode.

    if (keyboardState == 'editMode') {
        keyboardState = 'hotkeyMode';
        Blockly.Accessibility.InBlock.clearHighlights();
    }
};

/**
 * Dispose of this block.
 * @param {boolean} healStack If true, then try to heal any gap by connecting
 *     the next statement with the previous statement.  Otherwise, dispose of
 *     all children of this block.
 * @param {boolean} animate If true, show a disposal animation and sound.
 * @param {boolean} opt_dontRemoveFromWorkspace If true, don't remove this
 *     block from the workspace's list of top blocks.
 */
Blockly.BlockSvg.prototype.dispose = function (healStack, animate,
                                              opt_dontRemoveFromWorkspace) {
    this.defaultDispose(healStack, animate, opt_dontRemoveFromWorkspace);

    Blockly.Accessibility.Navigation.updateXmlSelection(true);
};

Array.prototype.contains = function(element) {
    return this.indexOf(element) > -1;
};

//#endregion


/**
 * Loads the xmlDoc based on the current blockly setting.
 * @param {boolean} Optional paramater.  If true, then don't select a block after updating the xml.
 */
Blockly.Accessibility.Navigation.updateXmlSelection = function (noSelect) {

    if (this.disableUpdate){
        return;
    }

    var prevXml = null;
    if (xmlDoc != null) {
        prevXml = Blockly.Xml.domToPrettyText(xmlDoc);
    }
	console.log('UpdateXML');

    if (noSelect){
        xmlDoc = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
        this.currentNode = null;
    }


   // console.log('Updating XML.');
    // If you currently have a node, make sure that if all block id's change you are still selecting the same block.
    if (this.currentNode) {
        //console.log('Maintaining Position');
        var pastId = parseInt(this.currentNode.getAttribute('id'));
        var idDifference = parseInt(Blockly.Accessibility.Navigation.findContainers()[0].getAttribute('id'));

        xmlDoc = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);

        idDifference = parseInt(Blockly.Accessibility.Navigation.findContainers()[0].getAttribute('id')) - idDifference;
        Blockly.Accessibility.Navigation.jumpToID(pastId + idDifference);
    }
        // Otherwise this is a non-issue
    else {
        //console.log('Finding block.');
        xmlDoc = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
        if (!xmlDoc.getElementsByTagName('BLOCK')) {
            this.currentNode = xmlDoc.getElementsByTagName('BLOCK')[0];
        }
    }

    // Check to see if we are adding this to the undo/redo stack
    if (Blockly.Xml.domToPrettyText(xmlDoc) != prevXml)
    {
        // If we are, remember the previous xml selection, and clear the redo stack.
        this.undoStack.push(prevXml);
        this.redoStack = [];

        //console.log('THERE WAS A CHANGE');

    }
}; 

/**
 * Undo the previous action
 */
Blockly.Accessibility.Navigation.undo = function() {
    if(this.undoStack.length <= 1)
    {
        return;
    }

    // Go back to the previous, keep track of stuff in case you want to redo, and update the scene.
    this.redoStack.push(Blockly.Xml.domToPrettyText(xmlDoc));
    xmlDoc = Blockly.Xml.textToDom(this.undoStack.pop());
    Blockly.Accessibility.Navigation.updateBlockSelection();
};

/**
 * Undo your undo.
 */
Blockly.Accessibility.Navigation.redo = function () {
    if (this.redoStack.length == 0) {
        return;
    }

    // Go back to the previous, keep track of stuff in case you want to redo, and update the scene.
    this.undoStack.push(Blockly.Xml.domToPrettyText(xmlDoc));
    xmlDoc = Blockly.Xml.textToDom(this.redoStack.pop());
    Blockly.Accessibility.Navigation.updateBlockSelection();
};


/**
 * Import the xml into the file, and update the xml in case of id changes.
 */
Blockly.Accessibility.Navigation.updateBlockSelection = function () {
    this.disableUpdate = true;
    workspace.clear();
    Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, xmlDoc);
    console.log(xmlDoc);
    this.disableUpdate = false;
};

//#region JUMP_FUNCTIONS

/**
 * Sets the current node to the one at the top of this section of blocks
 */
Blockly.Accessibility.Navigation.jumpToTopOfSection = function() {

    if (!this.currentNode) {
        console.log('Nothing Selected.')
        return;
    }

    console.log('Jumping to top of section.');
    this.currentNode = Blockly.Accessibility.Navigation.findTop(this.currentNode);
    console.log('Going to ' + this.currentNode.nodeName + ' with id ' + this.currentNode.getAttribute('id') + ' via cycle.');
    Blockly.Accessibility.Navigation.updateSelection();
};

/**
 * Sets the current node to the one at the bottom of this section of blocks
 */
Blockly.Accessibility.Navigation.jumpToBottomOfSection = function () {

    if (!this.currentNode) {
        console.log('Nothing Selected.')
        return;
    }

    console.log('Jumping to bottom of section.');
    this.currentNode = Blockly.Accessibility.Navigation.findTop(this.currentNode);
    console.log('Going to ' + this.currentNode.nodeName + ' with id ' + this.currentNode.getAttribute('id') + ' via cycle.');
    Blockly.Accessibility.Navigation.updateSelection();
};

/**
 * Jumps between containers (the very outside of block groups).
 * @param {int} The container's number that you are jumping to
 */
Blockly.Accessibility.Navigation.jumpToContainer = function(containerNumber) {

    console.log('Jumping to container ' + containerNumber);
    var containers = Blockly.Accessibility.Navigation.findContainers();

    // Jump to the appropriate section.
    if (containers[containerNumber]) {
        this.currentNode = containers[containerNumber];
        console.log('Going to ' + this.currentNode.nodeName + ' with id ' + this.currentNode.getAttribute('id'));
        Blockly.Accessibility.Navigation.updateSelection();
        return;
    }

    console.log('Container does not exist.');
};

/**
 * Jump to a specific id.
 * @param {int} The id of the block that you are jumping to
 */
Blockly.Accessibility.Navigation.jumpToID = function(id) {
    //console.log('Jumping to block with id ' + id);
    var jumpTo = Blockly.Accessibility.Navigation.getBlockNodeById(id);
    if (jumpTo) {
        this.currentNode = jumpTo;
        console.log('Going to ' + this.currentNode.nodeName + ' with id ' + this.currentNode.getAttribute('id'));
        Blockly.Accessibility.Navigation.updateSelection();
        return;
    }

    console.log('Block with id ' + id + ' not found.');
};

//#endregion

//#region TRAVERSAL_FUNCTIONS

/**
 * Goes out of a block to go up a level
 */
Blockly.Accessibility.Navigation.traverseOut = function () {

    // Null check
    if (Blockly.selected == null) {
        console.log('Cannot traverse outwards from here.');
        Blockly.Accessibility.Speech.Say('Cannot move further outwards from here.');

        return;
    }

    // Case where we're looking at an output block.
    if (Blockly.selected.outputConnection != null) {
        if (Blockly.selected.outputConnection.targetConnection != null) {
            Blockly.selected.outputConnection.targetConnection.sourceBlock_.select();
        }
        else {
            console.log('Cannot traverse outwards from here.');
            Blockly.Accessibility.Speech.Say('Cannot move further outwards from here.');
        }
        return;

    }

    // Elaborate series of checks for nulls, but if it comes out to be true then that means this is inside of a statement.
    if (
        Blockly.selected.previousConnection != null &&
        Blockly.selected.previousConnection.targetConnection != null && (
        Blockly.selected.previousConnection.targetConnection.sourceBlock_.nextConnection == null || //If any of the following are null, then we're safe
        Blockly.selected.previousConnection.targetConnection.sourceBlock_.nextConnection.targetConnection == null ||
        Blockly.selected.previousConnection.targetConnection.sourceBlock_.nextConnection.targetConnection.sourceBlock_ != Blockly.selected)) {


            Blockly.selected.previousConnection.targetConnection.sourceBlock_.select();

    }
    else {
        Blockly.Accessibility.Speech.Say('Cannot move further outwards from here.');
    }
};

/**
 * Goes inside of one block to go down a level
 */
Blockly.Accessibility.Navigation.traverseIn = function() {

    // Null check
    if (Blockly.selected == null) {
        Blockly.Accessibility.Speech.Say('Cannot move further inwards from here.');

        return;
    }

    if(Blockly.selected.childBlocks_ != null && Blockly.selected.childBlocks_.length > 0){
      for (var i = 0; i < Blockly.selected.childBlocks_.length; i++) {  
        if(Blockly.selected.childBlocks_[i].previousConnection != null && Blockly.selected.childBlocks_[i].previousConnection.type == 4){
            Blockly.selected.childBlocks_[i].select();
            return;
        }
      }
    }

    Blockly.Accessibility.Speech.Say('Cannot move further inwards from here.');
};

/**
 * Goes from one block to the next above it (no travel between layers)
 */
Blockly.Accessibility.Navigation.traverseUp = function() {

    // Null check
    if (Blockly.selected == null) {
         Blockly.Accessibility.Speech.Say('Cannot move further up from here.');

        return;
    }

    if (Blockly.selected.previousConnection != null &&
        Blockly.selected.previousConnection.targetConnection != null) {
        Blockly.selected.previousConnection.targetConnection.sourceBlock_.select();
    }
    else {
        Blockly.Accessibility.Speech.Say('Cannot move further up from here');

        if (this.currentNode == this.getOutermostNode(this.currentNode)) {
            this.previousContainer();
        }
    }

};

/**
 * Goes from one block to the next below it (no travel between layers)
 */
Blockly.Accessibility.Navigation.traverseDown = function() {

    // Null check
    if (Blockly.selected == null) {
        Blockly.Accessibility.Speech.Say('Cannot move further down from here.');
        return;
    }

    if (Blockly.selected.nextConnection != null &&
        Blockly.selected.nextConnection.targetConnection != null) {
        Blockly.selected.nextConnection.targetConnection.sourceBlock_.select();
    }
    else {
        //  Otherwise just report that you've hit the bottom.
        Blockly.Accessibility.Speech.Say('Cannot move further down from here.');


        // Check to make sure we're on the first layer before doing anything.
        if (this.currentNode == this.findBottom(this.getOutermostNode(this.currentNode))) {
            this.nextContainer();
        }
    }


};

/**
* Traverse through inline blocks (such as if statements)
*/
Blockly.Accessibility.Navigation.inlineBlockTraverseIn = function(){

    console.log(Blockly.selected);
  // ** TO DO ONLY SELECT INLINE BLOCKS NOT INNER BLOCKS**    

//  //select childblocks of currently selected block
//  if(Blockly.selected.childBlocks_.length-1 > Blockly.Accessibility.Navigation.inlineCount){
//        Blockly.selected.childBlocks_[Blockly.Accessibility.Navigation.inlineCount].select(); 
//        Blockly.Accessibility.Navigation.inlineCount++;
//    }

//   //select the first childblock
//   else if(Blockly.selected.childBlocks_.length-1 == Blockly.Accessibility.Navigation.inlineCount){

//        Blockly.selected.childBlocks_[Blockly.Accessibility.Navigation.inlineCount].select(); 
//        Blockly.Accessibility.Navigation.inlineCount == 0;
//    }
	
	//basic logic blocks have inputList lengths of 2 as well as other loop blocks
	if(Blockly.selected.inputList.length == 2){
		//null check to see if inLine traversal is possible
		if(Blockly.selected.inputList[0].connection.targetConnection != null){
			//selects the first inline block
			Blockly.selected.inputList[0].connection.targetConnection.sourceBlock_.select();
			
		}
		else{
			console.log("Cannot travel further inwards");
		}
	}
	
	//for blocks with multiple in line blocks
    //select childblocks of the parent block (example [(1) = (2)]  with 1 selected select 2 and vice versa)
    else{
        try{
            //Blockly.selected.parentBlock_.childBlocks_[Blockly.Accessibility.Navigation.inlineCount].select();
			Blockly.selected.parentBlock_.inputList[Blockly.Accessibility.Navigation.inlineCount].connection.targetConnection.sourceBlock_.select();
            Blockly.Accessibility.Navigation.inlineCount++;
        }
        //loop through children
        catch(e){
            console.log("cannot move further inwards");
            Blockly.Accessibility.Navigation.inlineCount = 0;

            //if block has a parent
            if(Blockly.selected.parentBlock_){
                 //Blockly.selected.parentBlock_.childBlocks_[Blockly.Accessibility.Navigation.inlineCount].select();
				 Blockly.selected.parentBlock_.inputList[Blockly.Accessibility.Navigation.inlineCount].connection.targetConnection.sourceBlock_.select(); 
                 Blockly.Accessibility.Navigation.inlineCount++; 
            }  
            //if on the top block select the first child again
            else{
                //Blockly.selected.childBlocks_[Blockly.Accessibility.Navigation.inlineCount].select();
				Blockly.selected.inputList[Blockly.Accessibility.Navigation.inlineCount].connection.targetConnection.sourceBlock_.select();
            }
        }
  }
	
	
};

/**
* When in the inside statement block allows you to traverse out through the child nodes
* Precondition: must be in edit mode which should select the first child block
*/
Blockly.Accessibility.Navigation.inlineBlockTraverseOut = function(){
 
   //select childblocks of currently selected block
  if(Blockly.selected.childBlocks_.length < Blockly.Accessibility.Navigation.inlineCount){
        console.log("if");
        Blockly.selected.childBlocks_[Blockly.Accessibility.Navigation.inlineCount].select(); 
        Blockly.Accessibility.Navigation.inlineCount--;
    }

   //select the first childblock
   else if(0 == Blockly.Accessibility.Navigation.inlineCount){
        console.log("else if");
        Blockly.selected.childBlocks_[Blockly.Accessibility.Navigation.inlineCount].select(); 
        Blockly.Accessibility.Navigation.inlineCount == Blockly.selected.childBlocks_.length-1;
    }
 
  //select childblocks of the parent block (example [(1) = (2)]  with 1 selected select 2 and vice versa)
  else{
        try{
            console.log("try");
            Blockly.selected.parentBlock_.childBlocks_[Blockly.Accessibility.Navigation.inlineCount].select();
            Blockly.Accessibility.Navigation.inlineCount--;
        }
        //loop through children
        catch(e){
            console.log("cannot move further inwards");
            Blockly.Accessibility.Navigation.inlineCount = Blockly.selected.childBlocks_.length-1;

            //if block has a parent
            if(Blockly.selected.parentBlock_){
                 Blockly.selected.parentBlock_.childBlocks_[Blockly.Accessibility.Navigation.inlineCount].select(); 
                 Blockly.Accessibility.Navigation.inlineCount--; 
            }  
            //if on the top block select the first child again
            else{
                Blockly.selected.childBlocks_[Blockly.Accessibility.Navigation.inlineCount].select();
            }
        }
  }
};

/**
 * Jumps you to the next container based on the one you are currently in
 */
Blockly.Accessibility.Navigation.nextContainer = function () {
    // Compare the region you're in to all of the other ones
    var currentSectionNode = this.getOutermostNode(this.currentNode);
    var myContainers = this.findContainers();


    // Just jump to the next one.
    for(var i = 0; i < myContainers.length; i++)
    {
        if (myContainers[i] == currentSectionNode) {
            if(i + 1 == myContainers.length)
            {
                this.jumpToContainer(0);
            }
            else {
                this.jumpToContainer(i + 1);
            }
        }
    }
};

/**
 * Jumps you to the previous container based on the one you are currently in
 */
Blockly.Accessibility.Navigation.previousContainer = function () {
    // Compare the region you're in to all of the other ones
    var currentSectionNode = this.getOutermostNode(this.currentNode);
    var myContainers = this.findContainers();


    // Just jump to the previous one.
    for (var i = 0; i < myContainers.length; i++) {
        if (myContainers[i] == currentSectionNode) {
            if (i - 1 < 0) {
                this.jumpToContainer(myContainers.length - 1);
            }
            else {
                this.jumpToContainer(i - 1);
            }
        }
    }
};


//#endregion

//#region HELPER_FUNCTIONS

/**
 * Navigates up to the top of a current section of blocks. Gets
 * to the top of the current indentation.
 * @param {myNode} Any node to be navigated from
 * @return {myNode} The top node in the level
 */
Blockly.Accessibility.Navigation.findTop = function(myNode) {
    // If the block's parent is a next node, that means it's below another.  Recursively go up.
    if (myNode.parentNode.nodeName.toUpperCase() == 'NEXT') {
        myNode = myNode.parentNode.parentNode;
        return Blockly.Accessibility.Navigation.findTop(myNode);
    }
    // If it's not the child of a next node, then it's the top node.
    return myNode;
};

/**
 * Navigates to the bottom of a section of blocks.
 * @param {node} Any node to be navigated from
 * @return {node} The bottom node in the level
 */
Blockly.Accessibility.Navigation.findBottom = function(myNode) {

    if(!myNode){
        return;
    }
    // Grab the children nodes of the current node, and see if any of them are a next.
    var children = myNode.childNodes;
    for (var i = 0; i < children.length; i++) {
        // If you do find a next, then we're moving straight to the block under.
        if (children[i].nodeName.toUpperCase() == 'NEXT') {
            myNode = children[i].getElementsByTagName('BLOCK')[0];
            return this.findBottom(myNode);
        }
    }
    // If you can't find a next, you're at the bottom.
    return myNode;

};

/**
 * Finds all of the containers in the current xmlstring and returns them.
 */
Blockly.Accessibility.Navigation.findContainers = function () {

    if (!xmlDoc) {
        return [];
    }

    // There is something weird going on with the xml parent child relationship.  For some reason I can't directly
    // grab the XML node, but this seems to work.  Further investigation needed.
    // I know that the first block is always going to be a region, so this should work
    // until a more clean solution is found.
    var containers = xmlDoc.getElementsByTagName('BLOCK')[0].parentNode.childNodes;

    // Need to remove parts that aren't blocks in case of #text's appearing for some reason.  We only want to deal with blocks.
    for (var i = containers.length - 1; i >= 0; i--) {
        if (containers[i].nodeName.toUpperCase() != 'BLOCK') {
            containers.splice(i, 1);
        }
    }

    return containers;
};

/**
 * Selects the block that you are currently on the node of
 */
Blockly.Accessibility.Navigation.updateSelection = function() {

    if (!this.currentNode) {
        console.log('Nothing Selected.')
        return;
    }

    Blockly.Block.getById(parseInt(this.currentNode.getAttribute('id')), workspace).select();

    Blockly.Accessibility.Prefixes.infoBoxFill(this.currentNode);
};

/**
 * Gets a specific node based on the block id.
 * @param {int} the block id number
 * @return {node} the block node
 */
Blockly.Accessibility.Navigation.getBlockNodeById = function(id) {

    if (!xmlDoc || !xmlDoc.getElementsByTagName('BLOCK')) {
        return null;
    }

    // Go through every block until you find the one with the right id
    var myBlocks = xmlDoc.getElementsByTagName('BLOCK');
    for (var i = 0; i < myBlocks.length; i++) {
        if (parseInt(myBlocks[i].getAttribute('id')) == id) {
            return myBlocks[i];
        }
    }
    // If you don't hit it return null.
    return null;
};

/**
 * Gets the first node of the region the node is in
 * @param {node} the node you want to find the region of
 * @return {node} the uppermost, outermost node
 */
Blockly.Accessibility.Navigation.getOutermostNode = function(inputNode){
    var myNode = inputNode;
    // temporary node used to store the previous iteration's current node
    var lastNode = null;

    // If myNode and lastNode are equal, then we've reached the outermost block
    while (myNode != lastNode) {
        lastNode = myNode;

        //Go to the top of the section
        myNode = this.findTop(myNode);

        //If you can pull out of the section, pull out of it
        if (myNode.parentNode.nodeName.toUpperCase() == 'STATEMENT' ||
        myNode.parentNode.nodeName.toUpperCase() == 'VALUE') {
            myNode = myNode.parentNode.parentNode;
        }

    }

    return myNode;
};

/**
 * Checks to see if nothing is selected, and if so, moves onto the first region.
 * @return {bool} True if nothing is selected, false otherwise.
 */
Blockly.Accessibility.Navigation.checkForNull = function () {
    if (!this.currentNode) {
        console.log('Nothing Selected.');
        this.jumpToContainer(0);
        return true;
    }
    return false;
}

Blockly.Accessibility.Navigation.getCurrentNode = function() {
    return this.currentNode;
};

Blockly.Accessibility.Navigation.playAudioBlock = function() {
    var here=getCurrentNode();
    var now=here.getAttribute('type');
    workspace.playAudio(Blockly.Blocks[now].returnAudio());
};

/**
* Recursive function that finds the statement block for any child of a statement block for inner traversal
*/
Blockly.Accessibility.Navigation.findTopStatementBlock = function(currentNode){
    if(currentNode.outputConnection != null){
        if(currentNode.outputConnection.type == 2){
            return this.findTopStatementBlock(currentNode.parentBlock_);
        }
    }
    else{
      return currentNode;
    }
};

/**
* The recursive function will find all the childNodes of a statement block for finding its children for inner traversal
*/
Blockly.Accessibility.Navigation.getAllChildrenOfStatement = function(currentNode){
    if(currentNode.childBlocks_ != null && currentNode.childBlocks_.length != 0){
        for(var i = 0; i < currentNode.childBlocks_.length; i++){
            if(currentNode.childBlocks_[i].outputConnection != null){
                this.statementChildren.push(currentNode.childBlocks_[i]);
                this.getAllChildrenOfStatement(currentNode.childBlocks_[i]);
            }
        }
    }
};

//#endregion
