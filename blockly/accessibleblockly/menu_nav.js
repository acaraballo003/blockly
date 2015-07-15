'use strict';

goog.provide('Blockly.Accessibility.menu_nav');
goog.require('Blockly.Accessibility');


Blockly.Flyout.prototype.defaultShow = Blockly.Flyout.prototype.show;

//called when the flyout opens
Blockly.Flyout.prototype.show = function(xmlList){

    oldLength = flyoutArr.length; //update the length of the last array 

    if(oldLength>0){              //ignore first case
        tabCount  = oldLength;
    }

    this.defaultShow(xmlList);    //call default and update flyoutArr
    flyoutArr = menuBlocksArr;
};

//Navigate down through the menu using down arrow
Blockly.Accessibility.menu_nav.menuNavDown = function(){

    //remove last select if not the first
    if(tabCount-1 >= 0 && tabCount!= oldLength){
        flyoutArr[tabCount-1].removeSelect();
    }

    //handle loops
    // if tabcount too high       || in variables menu                 || switching directions at the bottom of the menu
    if(tabCount>=flyoutArr.length || (flyoutArr.length-oldLength == 2) || (lastTabCount == tabCount+1 && tabCount+2>=flyoutArr.length)){
        tabCount = oldLength;
        lastTabCount=flyoutArr.length-1; 
        flyoutArr[lastTabCount].removeSelect();
    }

   //handle switching from up to down
   // if normal switch scenario  && not in variable menu
   if(lastTabCount == tabCount+1 && flyoutArr.length-oldLength!=2){
        flyoutArr[lastTabCount].removeSelect();
        tabCount+=2;
    }


    //select next -> save last -> increase count 
    flyoutArr[tabCount].addSelect(); 
    Blockly.Accessibility.menu_nav.readToolbox(); 
    lastTabCount = tabCount; 
    tabCount++;

};




//traverse up through the menu using up arrow
Blockly.Accessibility.menu_nav.menuNavUp = function(){
    
    //remove last select if possible also remove select that gets stuck on 1 after switching directions
    if((flyoutArr[lastTabCount] != undefined && tabCount!=oldLength) || lastTabCount==oldLength+1)
    {
        flyoutArr[lastTabCount].removeSelect();
    }
    //handle loops 
    //if tabcount is too low   || In variables menu (only 2 blocks)   || In audio menu (only 1 block)        || trying to switch directions at the top of the menu
    if(tabCount <= oldLength-1 || (flyoutArr.length - oldLength == 2) || (flyoutArr.length - oldLength == 1) || (lastTabCount == tabCount-1 && tabCount-2<oldLength)){
        lastTabCount = oldLength;
        tabCount = flyoutArr.length-1;
        flyoutArr[lastTabCount].removeSelect();
    }

    //handle switching from down to up
    //normal switch scenario       && not the first block  && not in the variables menu
    if(lastTabCount == tabCount-1  && tabCount!=oldLength  && (flyoutArr.length-oldLength!=2)){
        flyoutArr[lastTabCount].removeSelect();
        tabCount-=2;
    }
    //select next -> save last -> decrease count 
    flyoutArr[tabCount].addSelect();
    Blockly.Accessibility.menu_nav.readToolbox(); 
    lastTabCount = tabCount;         
    tabCount--; 
};

//#endregion

/**
 * When the selection changes, the block name is updated for screenreader
 */
 Blockly.Accessibility.menu_nav.readToolbox = function(){
    var allElements = document.getElementsByTagName('*');
    var shouldSay;
    var selectedBlock;
    var active = document.activeElement;
    var lastCategory; //track the category so that it does not deselect

    //if category is selected save it (all categories begin with :)
    if(active.id[0] ==":"){
        lastCategory = active;
        lastCategory.setAttribute("aria-owns", "blockReader");
    }

    //go through all the elements and find the one with matching type
    for(var i = 0; i < allElements.length; i++){
        //get the type of block
        var blockType = allElements[i].getAttribute("type");
        //check if that type is selected
        if(blockType == flyoutArr[tabCount].type){

            selectedBlock = allElements[i];

            var readBox = document.getElementById("blockReader");
            //var  = selectedBlock.getAttribute("type");
            var blockName = blockType.toUpperCase()+ "_TITLE";
            var say = (Blockly.Msg[blockName]);

            if(say !=undefined){
                shouldSay = say;
                if(say.includes("%1")) {
                    shouldSay = shouldSay.replace("%1", "blank,"); 
                }
                if(say.includes("%2")){
                shouldSay = shouldSay.replace("%2", "blank,");
            }
        }

            console.log(blockType);
            console.log(Blockly.Msg[blockName]);
            

            readBox.innerHTML = shouldSay;
            lastCategory.setAttribute("aria-labelledBy", "blockReader");
        }  
    }
};