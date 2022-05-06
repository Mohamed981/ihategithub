/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/lseqtree/lib/base.js":
/*!*******************************************!*\
  !*** ./node_modules/lseqtree/lib/base.js ***!
  \*******************************************/
/***/ ((module) => {

"use strict";


/**
 * Configuration and util class of the base, i.e. the maximal arity of the first
 * level of the tree.
 */
class Base {
    /**
     * @param {Number} [b = 3] The number of bits at level 0 of the dense space.
     */
    constructor (b = 3) {
        this._b = b;
    };

    /**
     * Process the number of bits usage at a certain level of dense space.
     * @param {Number} level The level in dense space, i.e., the number of
     * concatenations of the identifier.
     * @return {Number} The number of bit to encode a single path concatenation
     * at the depth in argument.
     */
    getBitBase (level) {
        return this._b + level;
    };

    /**
     * Process the total number of bits usage to get to a certain level.
     * @param {Number} level The level in dense space, i.e., the number of
     * concatenations of the identifier.
     * @return {Number} The number of bits required to encode the path
     * comprising level concatenations.
     */
    getSumBit (level) {
        const n = this.getBitBase(level);
        const m = this._b - 1;       
        return (n * (n + 1)) / 2 - (m * (m + 1) / 2);
    };

    /**
     * Process the number of possible paths between two LSEQNode.
     * @param {Number} level The depth of the tree to process.
     * @param {LSeqNode} p The previous LSeqNode.
     * @param {LSeqNode} q The next LSeqNode.
     * @return {Number} The interval between the two nodes at the depth in
     * argument.
     */
    getInterval (level, p, q) {               
        let sum = 0, i = 0,
            pIsGreater = false, commonRoot = true,
            prevValue = 0, nextValue = 0;
        
        while (i <= level) {
            prevValue = (p && p.t.p) || 0;
            nextValue = (q && q.t.p) || 0;            
            // #1 check if paths are identical
            if (commonRoot && prevValue !== nextValue) {
                commonRoot = false;
                pIsGreater = prevValue > nextValue;
            }
            // #2 process the value to add to interval
            if (pIsGreater) { nextValue = Math.pow(2,this.getBitBase(i))-1; }
            if (commonRoot || pIsGreater || i !== level) {
                sum += nextValue - prevValue; 
            } else {
                sum += nextValue - prevValue - 1;
            }
            if (i!==level){ sum *= Math.pow(2,this.getBitBase(i+1)); };
            // #3 iterate over path concatenations
            p = p && p.child || null;
            q = q && q.child || null;
            ++i;
        }
        return sum;
    };
    
};

module.exports = Base;


/***/ }),

/***/ "./node_modules/lseqtree/lib/exoutofbounds.js":
/*!****************************************************!*\
  !*** ./node_modules/lseqtree/lib/exoutofbounds.js ***!
  \****************************************************/
/***/ ((module) => {

"use strict";


/**
 * Thrown when the index is higher than the current length-1 of the array, or
 * lower than 0.
 */
class ExOutOfBounds {

    /** 
     * @param {Number} index The index out of bounds.
     * @param {Number} size The size of the array.
     */
    constructor (index, size) {
        this.index = index;
        this.size = size;
    };
};

module.exports = ExOutOfBounds;


/***/ }),

/***/ "./node_modules/lseqtree/lib/identifier.js":
/*!*************************************************!*\
  !*** ./node_modules/lseqtree/lib/identifier.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const BI = __webpack_require__(/*! BigInt */ "./node_modules/lseqtree/node_modules/BigInt/src/BigInt.js");
const Triple = __webpack_require__(/*! ./triple.js */ "./node_modules/lseqtree/lib/triple.js");
const LSeqNode = __webpack_require__(/*! ./lseqnode.js */ "./node_modules/lseqtree/lib/lseqnode.js");

/**
 * Unique and immutable identifier composed of digit, sources, counters.
 */
class Identifier {
    
    /**
     * @param {Base} base The base of identifiers.
     * @param {Number[]} digits The digit (position in dense space).
     * @param {Object[]} sites The list of sources.
     * @param {Number[]} counters The list of counters.
     */
    constructor (base, digits, sites = [], counters = []) {
        this._d = digits;
        this._s = sites;
        this._c = counters;
        
        this._base = base;
    };


    /**
     * Set the d,s,c values according to the node in argument
     * @param {LSeqNode} node The lseqnode containing the path in the tree
     * structure.
     * @return {Identifier} This identifier modified.
     */
    fromNode (node) {
        // #1 process the length of the path
        let length = 1, tempNode = node;
        
        while (!tempNode.isLeaf) {
	    ++length;
            tempNode = tempNode.child;
        };
        // #2 copy the values contained in the path
        this._d = BI.int2bigInt(0, this._base.getSumBit(length - 1));
        
        for (let i = 0; i < length ; ++i) {
            // #1a copy the site id
            this._s.push(node.t.s);
            // #1b copy the counter
            this._c.push(node.t.c);
            // #1c copy the digit
            BI.addInt_(this._d, node.t.p);
            if (i !== length - 1) {
                BI.leftShift_(this._d, this._base.getBitBase(i+1));
            };
            node = node.child;
        };
        
        return this;
    };
    
    /**
     * Convert the identifier into a node without element.
     * @param {Object} e The element associated with the node.
     * @return {LSeqNode} An LSeqNode containing the element and the path
     * extracted from this identifier.
     */
    toNode (e) {
        const dBitLength = this._base.getSumBit(this._c.length - 1);
        let resultPath = [], mine;
        
        // #1 deconstruct the digit 
        for (let i = 0; i < this._c.length; ++i) {
            // #1 truncate mine
            mine = BI.dup(this._d);
            // #1a shift right to erase the tail of the path
            BI.rightShift_(mine, dBitLength - this._base.getSumBit(i));
            // #1b copy value in the result
            resultPath.push(
                new Triple(BI.modInt(mine,
                                     Math.pow(2, this._base.getBitBase(i))),
                           this._s[i],
                           this._c[i]));
        };
        return new LSeqNode(resultPath, e);
    };


    /**
     * Compare two identifiers.
     * @param {Identifier} o The other identifier.
     * @return {Integer} -1 if this is lower, 0 if they are equal, 1 if this is
     * greater.
     */
    compareTo (o) {
        let dBitLength = this._base.getSumBit(this._c.length - 1),
            odBitLength = this._base.getSumBit(o._c.length - 1),
            comparing = true,
            result = 0, i = 0,
            sum, mine, other;
        
        // #1 Compare the list of <d,s,c>
        while (comparing && i < Math.min(this._c.length, o._c.length) ) {
            // can stop before the end of for loop wiz return
            sum = this._base.getSumBit(i);
            // #1a truncate mine
            mine = BI.dup(this._d);
            BI.rightShift_(mine, dBitLength - sum);
            // #1b truncate other
            other = BI.dup(o._d);
            BI.rightShift_(other, odBitLength - sum);
            // #2 Compare triples
            // #A digit
            if (!BI.equals(mine, other)) {
                if (BI.greater(mine, other)) {
                    result = 1;
                } else {
                    result = -1;
                };
                comparing = false;
            } else {
                // #B source
                result = this._s[i] - o._s[i]; 
                if (result !== 0) {
                    comparing = false;
                } else {
                    // #C counter
                    result = this._c[i] - o._c[i];
                    if (result !== 0) {
                        comparing = false;
                    };
                };
            };
            ++i;
        };
        
        // #3 compare list size
        if (result === 0){
            result = this._c.length - o._c.length;
        };
        
        return result;
    };    
};


module.exports = Identifier;


/***/ }),

/***/ "./node_modules/lseqtree/lib/lseqnode.js":
/*!***********************************************!*\
  !*** ./node_modules/lseqtree/lib/lseqnode.js ***!
  \***********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const Triple = __webpack_require__(/*! ./triple.js */ "./node_modules/lseqtree/lib/triple.js");

/**
 * A node of the LSeq tree.
 */
class LSeqNode {
    /**
     * @param {Triple[]} triples The list of triples composing the path to the
     * element.
     * @param {Object} element The element to insert in the structure, e.g., a
     * character in a text document.
     */
    constructor (triples = [], element = null) {
        this.t = triples.shift();
        this.e = null;
        if (triples.length === 0) { this.e = element; };
        this.subCounter = (triples.length > 0 && 1) || 0;
        this.children = [];
        triples.length > 0 &&
            this.children.push(new LSeqNode(triples, element));
    };
    
    /**
     * Getter to the first child.
     * @returns {LSeqNode} The first child of this node. Null if it does not
     * exists.
     */
    get child () {
        return ((this.children.length > 0) && this.children[0]) || null;
    };

    /**
     * Comparator between to LSeqNodes.
     * @param {LSeqNode} o The other LSeqNode to compare to.
     */
    compareTo (o) {
        return this.t.compareTo(o.t);
    };
    
    /**
     * Add a node to the current node.
     * @param {LSeqNode} node The node to add as a children of this node.
     * @return {Boolean} False if the element already exists, True otherwise.
     */
    add (node) {
        const index = this._binaryIndexOf(node);
        
        // #1 if the path do no exist, create it
        if (!this._contains(node)) {
            this.children.splice(-index, 0, node);
            this.subCounter += 1;
            // #2 otherwise, continue to explore the subtrees
        } else if (node.children.length === 0) {
            // #2a check if the element already exists
            if (this.children[index].e !== null){
                return false;
            } else {
                this.children[index].e = node.e;
                this.subCounter += 1;
            };
            // #3 if didnot exist, increment the counter
        } else if (this.children[index].add(node.child)) {
            this.subCounter += 1;
        };
        return true;
    };


    /**
     * Remove the node of the tree and all node within path being useless.
     * @param {LSeqNode} node the node containing the path to remove
     * @return {Boolean} True if the node has been removed, False if it does not
     * exist.
     */
    del (node) {
        const indexes = this._getIndexes(node);
        let currentTree = this, i = 0, isSplitted = false;

        // #1 The element does not exists, stop
        if (indexes.length === 0) { return false; };

        // #2 Crawl the path and remove the element
        currentTree.subCounter -= 1;
        while (i < indexes.length && !(isSplitted)) {
            let isLast = currentTree.children[indexes[i]]._hasElement &&
                i === indexes.length - 1;
            if (!isLast) {
                currentTree.children[indexes[i]].subCounter -= 1;     
            };
            if (currentTree.children[indexes[i]].subCounter <= 0 &&
                (!currentTree.children[indexes[i]]._hasElement || isLast)) {
                currentTree.children.splice(indexes[i], 1);
                isSplitted = true;
            };
            currentTree = currentTree.children[indexes[i]];
            ++i;
        };
        if (!isSplitted){ currentTree.e = null;};

        return true;
    };


    /**
     * The ordered tree can be linearized into a sequence. This function get the
     * index of the path represented by the list of triples.
     * @param {LSeqNode} node The node containing -- at least -- the path to the
     * element.
     * @return {Number} The index of the node in the linearized sequence; -1 if
     * the element does not exist.
     */
    indexOf (node) {
        const indexes = this._getIndexes(node);
        let sum = 0, currentTree = this, j;
        
        // #1 If the node does not exist, stop
        if (indexes.length === 0) { return -1; };

        // #2 Otherwise, start counting
        if (currentTree._hasElement) { sum += 1; };
        
        for (let i = 0; i < indexes.length; ++i) {
            if (indexes[i] < currentTree.children.length/2) {
                // #A start from the beginning [---->|     ]
                j = 0;
                while (j < indexes[i]) {
                    if (currentTree.children[j]._hasElement) { sum += 1; };
                    sum += currentTree.children[j].subCounter;
                    ++j;
                };
            } else {
                // #B start from the end [     |<----]
                sum += currentTree.subCounter;
                j = currentTree.children.length - 1;
                while (j >= indexes[i]) {
                    if (currentTree.children[j]._hasElement){ sum -= 1; };
                    sum -= currentTree.children[j].subCounter;
                    --j;
                };
                j += 1;
            };
            if (currentTree.children[j]._hasElement) { sum += 1; };
            currentTree = currentTree.children[j];
        };
        return sum - 1; // -1 because algorithm counted the element itself
    };


    /**
     * The ordered tree can be linearized. This function gets the node at the
     * index in the projected sequence.
     * @param {Number} index The index in the sequence.
     * @return {LSeqNode} The node at the index.
     */
    get (index) {

        /**
         * @param {Number} leftSum The sum of all element at the left of the
         * current inspected node.
         * @param {LSeqNode} buildingNode The head part of the node being built
         * as we crawl.
         * @param {LSeqNode} queue The queue part of the node being built.
         * @param {LSeqNode} currentNode The subtree being crawled.
         */
        const _get = (leftSum, buildingNode, queue, currentNode) => {
            let startBeginning = true, useFunction, i = 0, p, temp;
            // #0 The node is found, return the incrementally built node and
            // praise the sun !
            if (leftSum === index && currentNode._hasElement) {
                // 1a copy the value of the element in the path
                queue.e = currentNode.e;
                return buildingNode;
            };
            if (currentNode._hasElement){ leftSum += 1; };
            
            // #1 search: do I start from the beginning or the end
            startBeginning = index-leftSum < currentNode.subCounter/2;
            if (startBeginning) {
                useFunction = (a, b) => a + b;
            } else {
                leftSum += currentNode.subCounter;
                useFunction = (a, b) => a - b;
            }
            
            // #2a counting the element from left to right
            if (!startBeginning) { i = currentNode.children.length - 1; };
            while ((startBeginning && leftSum <= index) ||
                   (!startBeginning && leftSum > index)) {
                if (currentNode.children[i]._hasElement) {
                    leftSum = useFunction(leftSum, 1);
                };
                leftSum = useFunction(leftSum,
                                      currentNode.children[i].subCounter);
                i = useFunction(i, 1);
            };
            
            // #2b decreasing the incrementation
            i = useFunction(i, -1);
            if (startBeginning) {
                if (currentNode.children[i]._hasElement) {
                    leftSum = useFunction(leftSum, -1);
                };
                leftSum = useFunction(leftSum,
                                      -currentNode.children[i].subCounter);
            };
            
            // #3 build path
            p = []; p.push(currentNode.children[i].t);
            if (buildingNode === null) {
                buildingNode = new LSeqNode(p, null);
                queue = buildingNode;
            } else {
                temp = new LSeqNode(p, null);
                queue.add(temp);
                queue = temp;
            };
            return _get(leftSum, buildingNode, queue, currentNode.children[i]);
        };
        return _get(0, null, null, this);
    };

    /**
     * Cast a JSON object to an LSeqNode. 
     * @param {Object} o The JSON object.
     * @return {LSeqNode} An LSeqNode.
     */
    static fromJSON (o) {
        let beingBuilt;

        // #1 leaf
        if (o.children.length === 0){
            beingBuilt = new LSeqNode([new Triple(o.t.p, o.t.s, o.t.c)], o.e);
        } else {
            // #2 branch
            beingBuilt = new LSeqNode([new Triple(o.t.p, o.t.s, o.t.c)]);
            beingBuilt.children.push(LSeqNode.fromJSON(o.children[0]));
        };
        
        return beingBuilt;
    };
    
    /**
     * @private Get the list of indexes of the arrays representing the children
     * in the tree.  
     * @param {LSeqNode} node The node containing the path.
     * @return {Number[]} The successive indexes to get to the node. An empty
     * list if the node does not exist.
     */
    _getIndexes (node) {
        const __getIndexes = (indexes, currentTree, currentNode) => {
            if (!currentTree._contains(currentNode)) {
                return [];
            };
            
            const index = currentTree._binaryIndexOf(currentNode);
            
            indexes.push(index);
            
            return ((currentNode.children.length === 0 ||
                     currentTree.children.length === 0) && indexes) ||
                __getIndexes(indexes,
                             currentTree.children[index],
                             currentNode.child);            
        };
        
        return __getIndexes([], this, node);
    };
    
    


    /**
     * @private from: [https://gist.github.com/Wolfy87/5734530] Performs a
     * binary search on the host array.
     * @param {LSeqNode} searchElement The item to search for within the array.
     * @return {Number} The index of the element which defaults to -1 when not
     * found.
     */
    _binaryIndexOf (searchElement) {
        let minIndex = 0;
        let maxIndex = this.children.length - 1;
        let currentIndex;
        let currentElement;
        
        while (minIndex <= maxIndex) {
            currentIndex = Math.floor((minIndex + maxIndex) / 2);
            currentElement = this.children[currentIndex];
            if (currentElement.compareTo(searchElement) < 0) {
                minIndex = currentIndex + 1;
            } else if (currentElement.compareTo(searchElement) > 0) {
                maxIndex = currentIndex - 1;
            } else {
                return currentIndex;
            };
        };
        return ~maxIndex;
    };

    /**
     * @private Check whether this node contains the searchElement as children.
     * @param {LSeqNode} searchElement The element to look for.
     * @return {Boolean} True if this node contains the node in its
     * children, False otherwise.
     */
    _contains (searchElement) {
        const index = this._binaryIndexOf(searchElement);
        return this.children.length > 0 &&
            (index > 0 ||
             ((index === 0) &&
              this.child.compareTo(searchElement) === 0));
    };

    /**
     * @private Check if the node contains an element.
     * @return {Boolean} True if the node has an element, false otherwise.
     */
    get _hasElement () {
        return this.e !== null;
    };

    /**
     * Check if the node has children.
     * @return {Boolean} True if the node has children, false otherwise.
     */
    get isLeaf () {
        return this.children.length === 0;
    };
    
};

module.exports = LSeqNode;



/***/ }),

/***/ "./node_modules/lseqtree/lib/lseqtree.js":
/*!***********************************************!*\
  !*** ./node_modules/lseqtree/lib/lseqtree.js ***!
  \***********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const merge = __webpack_require__(/*! lodash/merge */ "./node_modules/lseqtree/node_modules/lodash/merge.js");

const Base = __webpack_require__(/*! ./base.js */ "./node_modules/lseqtree/lib/base.js");
const Strategy = __webpack_require__(/*! ./strategy.js */ "./node_modules/lseqtree/lib/strategy.js");
const Identifier = __webpack_require__(/*! ./identifier.js */ "./node_modules/lseqtree/lib/identifier.js");
const Triple = __webpack_require__(/*! ./triple.js */ "./node_modules/lseqtree/lib/triple.js");
const LSeqNode = __webpack_require__(/*! ./lseqnode.js */ "./node_modules/lseqtree/lib/lseqnode.js");

const ExOutOfBounds = __webpack_require__(/*! ./exoutofbounds.js */ "./node_modules/lseqtree/lib/exoutofbounds.js");


/**
 * Distributed array using LSeq allocation strategy with an underlying
 * exponential tree.
 */
class LSeqTree {

    /**
     * @param {Object} source The globally unique site identifier.
     * @param {Object} [options] The options of the LSeqTree.
     * @param {Number} [options.boundary = 10] The maximal interval between two
     * generated nodes.
     * @param {Number} [options.base = 15] The base, i.e., the maximal arity of
     * the root node. Default is 2**15.
     */
    constructor (site, options = {}) {
        let listTriple;
        // #0 process options

            this.options = merge({ boundary: 10, base: 15 }, options);
        

        // #1 initialize source, counter, and strategy choice
        this._s = site;
        this._c = 0;
        this._hash = (depth) => depth%2;

        this._base = new Base(this.options.base);
        this._strategy = new Strategy(this._base, this.options.boundary);

        // #2 initialize tree structure with maximal bounds
        this.root = new LSeqNode();
        if(site!=0)
        {  
            // #A minimal bound
            this.root.add(new LSeqNode([new Triple(0,0,0)], ''));
            // #B maximal bound
            this.root.add(
                new LSeqNode([new Triple(Math.pow(2, this._base.getBitBase(0)) - 1,
                                         Number.MAX_VALUE,
                                         Number.MAX_VALUE)], ''));
        }
        
 
    };

    
    get length () {
        let result = this.root.subCounter - 2; // -2: the boundaries
        result = (this.root._hasElement && result + 1) || result;
        return result;
    };
    
    /**
     * Get the element at targeted index in the linearized sequence. It does not
     * take into account the hidden boundaries of the sequence [MIN, e_1, e_2,
     * ... e_length, MAX], hence index of e_1 is 0.
     * @param {Number} index The index of the element in the flattened array.
     * @return {Object} The element located at the index in argument.
     */
    get (index) {
        if (index < 0 || index >= this.length) {
            throw new ExOutOfBounds(index, this.length);
        };
        
        let node = this.root.get(index + 1);
        while (!node.isLeaf){
            node = node.child;
        };
        return node.e;
    };
    
    /**
     * @private Get the LSeqNode at targeted index in the linearized
     * sequence. The sequence includes the hidden boundaries [MIN, e_1, e_2,
     * ... e_length, MAX], hence e_1's index is 1.
     * @param {Number} index The index of the element in the flattened array.
     * @return {LSeqNode} The LSeqNode targeting the element at index.
     */
    _get (index) {
        if (index < 0 || index >= this.length + 2) { // +2: boundaries
            throw new ExOutOfBounds(index, this.length + 2);
        };
        
        return this.root.get(index);
    };

    /**
     * Insert a value at the targeted index.
     * @param {Object} element The element to insert, e.g. a character if the
     * sequence is a string.
     * @param {Number} index The position in the array.
     * @return {Object} {_e: element of Object type, _i: Identifier}
     */
    insert (element, index) {
        const pei = this._get(index), // #1a previous bound
              qei = this._get(index+1); // #1b next bound

         // #2a incrementing the local counter
        this._c += 1;
        // #2b generating the id inbetween the bounds
        const id = this.alloc(pei, qei);

        // #3 add it to the structure and return value
        const pair = {elem: element, id: id};
        this.applyInsert(pair);
        return pair;
    };

    /**
     * Delete the element at the index.
     * @param {Number} index The index of the element to delete in the array.
     * @return {Identifier} The identifier of the element at the index.
     */
    remove (index) {
        const ei = this._get(index + 1);
        const i = new Identifier(this._base).fromNode(ei);
        this.applyRemove(ei);
        return i;
    };


    /**
     * Generate the digit part of the identifiers  between p and q.
     * @param {LSeqNode} p The digit part of the previous identifier.
     * @param {LSeqNode} q The digit part of the next identifier.
     * @return {Identifier} The new identifier located between p and q.
     */
    alloc (p, q) {
        let interval = 0, level = 0;
        // #1 process the level of the new identifier
        while (interval <= 0) { // no room for insertion
            interval = this._base.getInterval(level, p, q);
            ++level;
        };
        level -= 1;
        if (this._hash(level) === 0) {
            return this._strategy.bPlus(p, q,
                                        level, interval,
                                        this._s, this._c);
        } else {
            return this._strategy.bMinus(p, q,
                                         level, interval,
                                         this._s, this._c);
        };
    };
    
    
    /**
     * Insert an element created from a remote site into the array.
     * @param {Object} pair Pair containing the identifier and the element to
     * insert in the data structure.
     * @param {Identifier|LSeqNode} pair.id The identifier of the element.
     * @param {Object} pair.elem The element to insert.
     * @param {boolean} [noIndex = true] Whether or not it should return the
     * index of the insert.
     * @return {Number|Boolean} The index of the newly inserted element in the
     * array, if asked. -1 if the element already exists and has not been added.
     * If noIndex, returns true if the element has been added, false otherwise.
     */
    applyInsert (pair, noIndex = true) {
        let node, result, i;
        // #0 cast from the proper type
        // #0A the identifier is an Identifier
        i = pair.id;
        node =  i && i._d && i._s && i._c &&
            (new Identifier(this._base, i._d, i._s, i._c).toNode(pair.elem));
        // #0B the identifier is a LSeqNode
        node = (i && i.t && i.children && LSeqNode.fromJSON(i)) || node;
        // #1 integrates the new element to the data structure
        result = this.root.add(node);
        // #2 if the element as been added
        if (noIndex) {
            return result;
        } else if (result) {
            return this.root.indexOf(node);
        } else {
            return -1;
        };        
    };

    /**
     * Delete the element with the targeted identifier.
     * @param {Identifier|LSeqNode} i The identifier of the element.
     * @return {Number} The index of the element freshly deleted, -1 if no
     * removal.
     */
    applyRemove (i) {
        let node, position;
        // #0 cast from the proper type
        node = i && i._d && i._s && i._c &&
            (new Identifier(this._base, i._d, i._s, i._c)).toNode(null);
        // #0B the identifier is a LSEQNode
        node = (i && i.t && i.children && LSeqNode.fromJSON(i)) || node;
        // #1 get the index of the element to remove
        position = this.root.indexOf(node);
        if (position !== -1){
            // #2 if it exists remove it
            this.root.del(node);
        };
        return position;
    };

    /**
     * Cast the JSON object into a proper LSeqTree.
     * @param {Object} object the JSON object to cast.
     * @return {LSeqTree} A self reference.
     */
    fromJSON (object) {
        // #1 copy the source, counter, and length of the object
        this._s = object._s;
        this._c = object._c;
        this.options = object.options;


        // this._base = new Base(this.options.base); //I commented this line on purpose
        //this._boundary = new Strategy(this._base, this.options.boundary);
        
        // #2 depth first adding
        const depthFirst = (currentNode, currentPath) => {
            const triple = new Triple(currentNode.t.p,
                                      currentNode.t.s,
                                      currentNode.t.c);
            currentPath.push(triple); // stack
            if (currentNode.e !== null) {
                this.root.add(new LSeqNode(currentPath.slice(), currentNode.e));
            };
            for (let i = 0; i < currentNode.children.length; ++i) {
                depthFirst(currentNode.children[i], currentPath);
            };
            currentPath.pop(); // unstack
        };
        for (let i = 0; i < object.root.children.length; ++i){
            depthFirst(object.root.children[i], []);
        };
        return this;
    };   
    
    
    traverse () {
       let tree_size = this.length; 
       let output = "";
       
       for(let i = 0; i<tree_size;i++)
       output = output + this.get(i);

       return output;
    };   
    
};

module.exports = LSeqTree;


/***/ }),

/***/ "./node_modules/lseqtree/lib/strategy.js":
/*!***********************************************!*\
  !*** ./node_modules/lseqtree/lib/strategy.js ***!
  \***********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const BI = __webpack_require__(/*! BigInt */ "./node_modules/lseqtree/node_modules/BigInt/src/BigInt.js");
const Identifier = __webpack_require__(/*! ./identifier.js */ "./node_modules/lseqtree/lib/identifier.js");

/**
 * Enumerate the available sub-allocation strategies. The signature of these
 * functions is f(Id, Id, N+, N+, N, N): Id.
 */
class Strategy {    
    /**
     * @param {Base} base The base used to create the new identifiers.
     * @param {Number} [boundary = 10] The value used as the default maximum
     * spacing between identifiers.
     */
    constructor (base, boundary = 10) {
        this._base = base;
        this._boundary = boundary;
    };
    
    /**
     * Choose an identifier starting from previous bound and adding random
     * number.
     * @param {LSeqNode} p The previous identifier.
     * @param {LSeqNode} q The next identifier.
     * @param {Number} level The number of concatenation composing the new
     * identifier.
     * @param {Number} interval The interval between p and q.
     * @param {Object} s The source that creates the new identifier.
     * @param {Number} c The counter of that source.
     * @return {Identifier} The new allocated identifier.
     */
    bPlus (p, q, level, interval, s, c) {
        let copyP = p, copyQ = q,
            step = Math.min(this._boundary, interval), //#0 the min interval
            digit = BI.int2bigInt(0, this._base.getSumBit(level)),
            value;
        
        // #1 copy the previous identifier
        for (let i = 0; i <= level; ++i) {
	    value = (p && p.t.p) || 0;
            BI.addInt_(digit, value);
            if (i !== level) {
                BI.leftShift_(digit, this._base.getBitBase(i + 1));
            };
            p = (p && !p.isLeaf && p.child) || null;
        };
        // #2 create a digit for an identifier by adding a random value
        // #A Digit
        BI.addInt_(digit, Math.floor(Math.random() * step + 1));
        // #B Source & counter
        return this._getSC(digit, copyP, copyQ, level, s, c);
    };


    
    /**
     * Choose an identifier starting from next bound and substract a random
     * number.
     * @param {LSeqNode} p The previous identifier.
     * @param {LSeqNode} q The next identifier.
     * @param {Number} level The number of concatenation composing the new
     * identifier.
     * @param {Number} interval The interval between p and q.
     * @param {Object} s The source that creates the new identifier.
     * @param {Number} c The counter of that source.
     */
    bMinus (p, q, level, interval, s, c) {
        let copyP = p, copyQ = q,
            step = Math.min(this._boundary, interval),// #0 process min interval
            digit = BI.int2bigInt(0, this._base.getSumBit(level)),
            pIsGreater = false, commonRoot = true,
            prevValue, nextValue;
        
        // #1 copy next, if previous is greater, copy maxValue @ depth
        for (let i = 0; i <= level; ++i) {
            prevValue = (p && p.t.p) || 0;
            nextValue = (q && q.t.p) || 0;
            
            if (commonRoot && prevValue !== nextValue) {
                commonRoot = false;
                pIsGreater = prevValue > nextValue;
            };
            if (pIsGreater) {
                nextValue = Math.pow(2,this._base.getBitBase(i))-1;
            };
            BI.addInt_(digit, nextValue);
            if (i !== level) {
                BI.leftShift_(digit,this._base.getBitBase(i+1));
            };

            q = (q && !q.isLeaf && q.child) || null;
            p = (p && !p.isLeaf && p.child) || null;
        };
        
        // #3 create a digit for an identifier by subing a random value
        // #A Digit
        if (pIsGreater) {
            BI.addInt_(digit, -Math.floor(Math.random()*step) );
        } else {
            BI.addInt_(digit, -Math.floor(Math.random()*step)-1 );
        };
    
        // #B Source & counter
        return this._getSC(digit, copyP, copyQ, level, s, c);
    };

    /**
     * Copies the appropriates source and counter from the adjacent identifiers
     * at the insertion position.
     * @param {Number} d The digit part of the new identifier.
     * @param {LSeqNode} p The previous identifier.
     * @param {LSeqNode} q the next identifier.
     * @param {Number} level The size of the new identifier.
     * @param {Object} s The local site identifier.
     * @param {Number} c The local monotonic counter.
     * @return {Identifier} The new allocated identifier.
     */
    _getSC (d, p, q, level, s, c) {
        let sources = [], counters = [],
            i = 0,
            sumBit = this._base.getSumBit(level),
            tempDigit, value;
        
        while (i <= level) {
            tempDigit = BI.dup(d);
            BI.rightShift_(tempDigit, sumBit - this._base.getSumBit(i));
            value = BI.modInt(tempDigit, Math.pow(2, this._base.getBitBase(i)));
            sources[i]=s;
            counters[i]=c;
            
            if (q && q.t.p === value) { sources[i]=q.t.s; counters[i]=q.t.c; };
            if (p && p.t.p === value) { sources[i]=p.t.s; counters[i]=p.t.c; };
            
            q = (q && !q.isLeaf && q.child) || null;
            p = (p && !p.isLeaf && p.child) || null;

            ++i;
        };
        
        return new Identifier(this._base, d, sources, counters);
    };
    
};

module.exports = Strategy;


/***/ }),

/***/ "./node_modules/lseqtree/lib/triple.js":
/*!*********************************************!*\
  !*** ./node_modules/lseqtree/lib/triple.js ***!
  \*********************************************/
/***/ ((module) => {

"use strict";


/**
 * Triple that contains <path; site; counter>. Identifiers of LSEQ are lists of
 * triples.
 */
class Triple {

    /**
     * @param {Number} path The part of the path in the tree.
     * @param {Number|String} site The unique site identifier that created the
     * triple.
     * @param {Number} counter The local counter of the site when it created the
     * triple.
     */       
    constructor (path, site, counter) {
        this.p = path;
        this.s = site;
        this.c = counter;
    };

    /**
     * Compare two triples prioritizing the path, then site, then counter.
     * @param {Triple} o the other triple to compare .
     * @returns {Number} -1 if this is lower than o, 1 if this is greater than
     * o, 0 otherwise.
     */
    compareTo (o) {
        // #1 process maximal virtual bounds
        if (this.s === Number.MAX_VALUE && this.c === Number.MAX_VALUE){
            return 1;
        };
        if (o.s === Number.MAX_VALUE && o.s === Number.MAX_VALUE){
            return -1;
        };
        // #2 compare p then s then c
        if (this.p < o.p) { return -1;};
        if (this.p > o.p) { return 1 ;};
        if (this.s < o.s) { return -1;};
        if (this.s > o.s) { return 1 ;};
        if (this.c < o.c) { return -1;};
        if (this.c > o.c) { return 1 ;};
        // #3 they are equal
        return 0;
    };
};

module.exports = Triple;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/BigInt/src/BigInt.js":
/*!*****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/BigInt/src/BigInt.js ***!
  \*****************************************************************/
/***/ ((module, exports, __webpack_require__) => {

/* module decorator */ module = __webpack_require__.nmd(module);
// Vjeux: Customized bigInt2str and str2bigInt in order to accept custom base.

////////////////////////////////////////////////////////////////////////////////////////
// Big Integer Library v. 5.5
// Created 2000, last modified 2013
// Leemon Baird
// www.leemon.com
//
// Version history:
// v 5.5  17 Mar 2013
//   - two lines of a form like "if (x<0) x+=n" had the "if" changed to "while" to 
//     handle the case when x<-n. (Thanks to James Ansell for finding that bug)
// v 5.4  3 Oct 2009
//   - added "var i" to greaterShift() so i is not global. (Thanks to P�ter Szab� for finding that bug)
//
// v 5.3  21 Sep 2009
//   - added randProbPrime(k) for probable primes
//   - unrolled loop in mont_ (slightly faster)
//   - millerRabin now takes a bigInt parameter rather than an int
//
// v 5.2  15 Sep 2009
//   - fixed capitalization in call to int2bigInt in randBigInt
//     (thanks to Emili Evripidou, Reinhold Behringer, and Samuel Macaleese for finding that bug)
//
// v 5.1  8 Oct 2007 
//   - renamed inverseModInt_ to inverseModInt since it doesn't change its parameters
//   - added functions GCD and randBigInt, which call GCD_ and randBigInt_
//   - fixed a bug found by Rob Visser (see comment with his name below)
//   - improved comments
//
// This file is public domain.   You can use it for any purpose without restriction.
// I do not guarantee that it is correct, so use it at your own risk.  If you use 
// it for something interesting, I'd appreciate hearing about it.  If you find 
// any bugs or make any improvements, I'd appreciate hearing about those too.
// It would also be nice if my name and URL were left in the comments.  But none 
// of that is required.
//
// This code defines a bigInt library for arbitrary-precision integers.
// A bigInt is an array of integers storing the value in chunks of bpe bits, 
// little endian (buff[0] is the least significant word).
// Negative bigInts are stored two's complement.  Almost all the functions treat
// bigInts as nonnegative.  The few that view them as two's complement say so
// in their comments.  Some functions assume their parameters have at least one 
// leading zero element. Functions with an underscore at the end of the name put
// their answer into one of the arrays passed in, and have unpredictable behavior 
// in case of overflow, so the caller must make sure the arrays are big enough to 
// hold the answer.  But the average user should never have to call any of the 
// underscored functions.  Each important underscored function has a wrapper function 
// of the same name without the underscore that takes care of the details for you.  
// For each underscored function where a parameter is modified, that same variable 
// must not be used as another argument too.  So, you cannot square x by doing 
// multMod_(x,x,n).  You must use squareMod_(x,n) instead, or do y=dup(x); multMod_(x,y,n).
// Or simply use the multMod(x,x,n) function without the underscore, where
// such issues never arise, because non-underscored functions never change
// their parameters; they always allocate new memory for the answer that is returned.
//
// These functions are designed to avoid frequent dynamic memory allocation in the inner loop.
// For most functions, if it needs a BigInt as a local variable it will actually use
// a global, and will only allocate to it only when it's not the right size.  This ensures
// that when a function is called repeatedly with same-sized parameters, it only allocates
// memory on the first call.
//
// Note that for cryptographic purposes, the calls to Math.random() must 
// be replaced with calls to a better pseudorandom number generator.
//
// In the following, "bigInt" means a bigInt with at least one leading zero element,
// and "integer" means a nonnegative integer less than radix.  In some cases, integer 
// can be negative.  Negative bigInts are 2s complement.
// 
// The following functions do not modify their inputs.
// Those returning a bigInt, string, or Array will dynamically allocate memory for that value.
// Those returning a boolean will return the integer 0 (false) or 1 (true).
// Those returning boolean or int will not allocate memory except possibly on the first 
// time they're called with a given parameter size.
// 
// bigInt  add(x,y)               //return (x+y) for bigInts x and y.  
// bigInt  addInt(x,n)            //return (x+n) where x is a bigInt and n is an integer.
// string  bigInt2str(x,base)     //return a string form of bigInt x in a given base, with 2 <= base <= 95
// int     bitSize(x)             //return how many bits long the bigInt x is, not counting leading zeros
// bigInt  dup(x)                 //return a copy of bigInt x
// boolean equals(x,y)            //is the bigInt x equal to the bigint y?
// boolean equalsInt(x,y)         //is bigint x equal to integer y?
// bigInt  expand(x,n)            //return a copy of x with at least n elements, adding leading zeros if needed
// Array   findPrimes(n)          //return array of all primes less than integer n
// bigInt  GCD(x,y)               //return greatest common divisor of bigInts x and y (each with same number of elements).
// boolean greater(x,y)           //is x>y?  (x and y are nonnegative bigInts)
// boolean greaterShift(x,y,shift)//is (x <<(shift*bpe)) > y?
// bigInt  int2bigInt(t,n,m)      //return a bigInt equal to integer t, with at least n bits and m array elements
// bigInt  inverseMod(x,n)        //return (x**(-1) mod n) for bigInts x and n.  If no inverse exists, it returns null
// int     inverseModInt(x,n)     //return x**(-1) mod n, for integers x and n.  Return 0 if there is no inverse
// boolean isZero(x)              //is the bigInt x equal to zero?
// boolean millerRabin(x,b)       //does one round of Miller-Rabin base integer b say that bigInt x is possibly prime? (b is bigInt, 1<b<x)
// boolean millerRabinInt(x,b)    //does one round of Miller-Rabin base integer b say that bigInt x is possibly prime? (b is int,    1<b<x)
// bigInt  mod(x,n)               //return a new bigInt equal to (x mod n) for bigInts x and n.
// int     modInt(x,n)            //return x mod n for bigInt x and integer n.
// bigInt  mult(x,y)              //return x*y for bigInts x and y. This is faster when y<x.
// bigInt  multMod(x,y,n)         //return (x*y mod n) for bigInts x,y,n.  For greater speed, let y<x.
// boolean negative(x)            //is bigInt x negative?
// bigInt  powMod(x,y,n)          //return (x**y mod n) where x,y,n are bigInts and ** is exponentiation.  0**0=1. Faster for odd n.
// bigInt  randBigInt(n,s)        //return an n-bit random BigInt (n>=1).  If s=1, then the most significant of those n bits is set to 1.
// bigInt  randTruePrime(k)       //return a new, random, k-bit, true prime bigInt using Maurer's algorithm.
// bigInt  randProbPrime(k)       //return a new, random, k-bit, probable prime bigInt (probability it's composite less than 2^-80).
// bigInt  str2bigInt(s,b,n,m)    //return a bigInt for number represented in string s in base b with at least n bits and m array elements
// bigInt  sub(x,y)               //return (x-y) for bigInts x and y.  Negative answers will be 2s complement
// bigInt  trim(x,k)              //return a copy of x with exactly k leading zero elements
//
//
// The following functions each have a non-underscored version, which most users should call instead.
// These functions each write to a single parameter, and the caller is responsible for ensuring the array 
// passed in is large enough to hold the result. 
//
// void    addInt_(x,n)          //do x=x+n where x is a bigInt and n is an integer
// void    add_(x,y)             //do x=x+y for bigInts x and y
// void    copy_(x,y)            //do x=y on bigInts x and y
// void    copyInt_(x,n)         //do x=n on bigInt x and integer n
// void    GCD_(x,y)             //set x to the greatest common divisor of bigInts x and y, (y is destroyed).  (This never overflows its array).
// boolean inverseMod_(x,n)      //do x=x**(-1) mod n, for bigInts x and n. Returns 1 (0) if inverse does (doesn't) exist
// void    mod_(x,n)             //do x=x mod n for bigInts x and n. (This never overflows its array).
// void    mult_(x,y)            //do x=x*y for bigInts x and y.
// void    multMod_(x,y,n)       //do x=x*y  mod n for bigInts x,y,n.
// void    powMod_(x,y,n)        //do x=x**y mod n, where x,y,n are bigInts (n is odd) and ** is exponentiation.  0**0=1.
// void    randBigInt_(b,n,s)    //do b = an n-bit random BigInt. if s=1, then nth bit (most significant bit) is set to 1. n>=1.
// void    randTruePrime_(ans,k) //do ans = a random k-bit true random prime (not just probable prime) with 1 in the msb.
// void    sub_(x,y)             //do x=x-y for bigInts x and y. Negative answers will be 2s complement.
//
// The following functions do NOT have a non-underscored version. 
// They each write a bigInt result to one or more parameters.  The caller is responsible for
// ensuring the arrays passed in are large enough to hold the results. 
//
// void addShift_(x,y,ys)       //do x=x+(y<<(ys*bpe))
// void carry_(x)               //do carries and borrows so each element of the bigInt x fits in bpe bits.
// void divide_(x,y,q,r)        //divide x by y giving quotient q and remainder r
// int  divInt_(x,n)            //do x=floor(x/n) for bigInt x and integer n, and return the remainder. (This never overflows its array).
// void eGCD_(x,y,d,a,b)        //sets a,b,d to positive bigInts such that d = GCD_(x,y) = a*x-b*y
// void halve_(x)               //do x=floor(|x|/2)*sgn(x) for bigInt x in 2's complement.  (This never overflows its array).
// void leftShift_(x,n)         //left shift bigInt x by n bits.  n<bpe.
// void linComb_(x,y,a,b)       //do x=a*x+b*y for bigInts x and y and integers a and b
// void linCombShift_(x,y,b,ys) //do x=x+b*(y<<(ys*bpe)) for bigInts x and y, and integers b and ys
// void mont_(x,y,n,np)         //Montgomery multiplication (see comments where the function is defined)
// void multInt_(x,n)           //do x=x*n where x is a bigInt and n is an integer.
// void rightShift_(x,n)        //right shift bigInt x by n bits.  0 <= n < bpe. (This never overflows its array).
// void squareMod_(x,n)         //do x=x*x  mod n for bigInts x,n
// void subShift_(x,y,ys)       //do x=x-(y<<(ys*bpe)). Negative answers will be 2s complement.
//
// The following functions are based on algorithms from the _Handbook of Applied Cryptography_
//    powMod_()           = algorithm 14.94, Montgomery exponentiation
//    eGCD_,inverseMod_() = algorithm 14.61, Binary extended GCD_
//    GCD_()              = algorothm 14.57, Lehmer's algorithm
//    mont_()             = algorithm 14.36, Montgomery multiplication
//    divide_()           = algorithm 14.20  Multiple-precision division
//    squareMod_()        = algorithm 14.16  Multiple-precision squaring
//    randTruePrime_()    = algorithm  4.62, Maurer's algorithm
//    millerRabin()       = algorithm  4.24, Miller-Rabin algorithm
//
// Profiling shows:
//     randTruePrime_() spends:
//         10% of its time in calls to powMod_()
//         85% of its time in calls to millerRabin()
//     millerRabin() spends:
//         99% of its time in calls to powMod_()   (always with a base of 2)
//     powMod_() spends:
//         94% of its time in calls to mont_()  (almost always with x==y)
//
// This suggests there are several ways to speed up this library slightly:
//     - convert powMod_ to use a Montgomery form of k-ary window (or maybe a Montgomery form of sliding window)
//         -- this should especially focus on being fast when raising 2 to a power mod n
//     - convert randTruePrime_() to use a minimum r of 1/3 instead of 1/2 with the appropriate change to the test
//     - tune the parameters in randTruePrime_(), including c, m, and recLimit
//     - speed up the single loop in mont_() that takes 95% of the runtime, perhaps by reducing checking
//       within the loop when all the parameters are the same length.
//
// There are several ideas that look like they wouldn't help much at all:
//     - replacing trial division in randTruePrime_() with a sieve (that speeds up something taking almost no time anyway)
//     - increase bpe from 15 to 30 (that would help if we had a 32*32->64 multiplier, but not with JavaScript's 32*32->32)
//     - speeding up mont_(x,y,n,np) when x==y by doing a non-modular, non-Montgomery square
//       followed by a Montgomery reduction.  The intermediate answer will be twice as long as x, so that
//       method would be slower.  This is unfortunate because the code currently spends almost all of its time
//       doing mont_(x,x,...), both for randTruePrime_() and powMod_().  A faster method for Montgomery squaring
//       would have a large impact on the speed of randTruePrime_() and powMod_().  HAC has a couple of poorly-worded
//       sentences that seem to imply it's faster to do a non-modular square followed by a single
//       Montgomery reduction, but that's obviously wrong.
////////////////////////////////////////////////////////////////////////////////////////
(function(factory) {
    if (true) {
        // CommonJS
        factory(__webpack_require__("./node_modules/lseqtree/node_modules/BigInt/src sync recursive"), exports, module);
    } else { var _require, _module; }
})(function (require, exports, module) {
    "use strict";

    var trueRandom = function () { return Math.random(); };

    function setRandom(random) {
        trueRandom = random;
    }

    //globals
    var bpe=0;         //bits stored per array element
    var mask=0;        //AND this with an array element to chop it down to bpe bits
    var radix=mask+1;  //equals 2^bpe.  A single 1 bit to the left of the last bit of mask.

    //the digits for converting to different bases
    var digitsStr='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_=!@#$%^&*()[]{}|;:,.<>/?`~ \\\'\"+-';

    //initialize the global variables
    for (bpe=0; (1<<(bpe+1)) > (1<<bpe); bpe++);  //bpe=number of bits in the mantissa on this platform
    bpe>>=1;                   //bpe=number of bits in one element of the array representing the bigInt
    mask=(1<<bpe)-1;           //AND the mask with an integer to get its bpe least significant bits
    radix=mask+1;              //2^bpe.  a single 1 bit to the left of the first bit of mask
    var one=int2bigInt(1,1,1);     //constant used in powMod_()

    //the following global variables are scratchpad memory to
    //reduce dynamic memory allocation in the inner loop
    var t=new Array(0);
    var ss=t;       //used in mult_()
    var s0=t;       //used in multMod_(), squareMod_()
    var s1=t;       //used in powMod_(), multMod_(), squareMod_()
    var s2=t;       //used in powMod_(), multMod_()
    var s3=t;       //used in powMod_()
    var s4= t, s5=t; //used in mod_()
    var s6=t;       //used in bigInt2str()
    var s7=t;       //used in powMod_()
    var T=t;        //used in GCD_()
    var sa=t;       //used in mont_()
    var mr_x1= t, mr_r= t, mr_a=t;                                      //used in millerRabin()
    var eg_v= t, eg_u= t, eg_A=t, eg_B=t, eg_C=t, eg_D=t;               //used in eGCD_(), inverseMod_()
    var md_q1=t, md_q2=t, md_q3=t, md_r=t, md_r1=t, md_r2=t, md_tt=t; //used in mod_()

    var primes=t, pows=t, s_i=t, s_i2=t, s_R=t, s_rm=t, s_q=t, s_n1=t;
    var s_a=t, s_r2=t, s_n=t, s_b=t, s_d=t, s_x1=t, s_x2=t, s_aa=t; //used in randTruePrime_()

    var rpprb=t; //used in randProbPrimeRounds() (which also uses "primes")

    ////////////////////////////////////////////////////////////////////////////////////////


    //return array of all primes less than integer n
    function findPrimes(n) {
      var i,s,p,ans;
      s=new Array(n);
      for (i=0;i<n;i++)
        s[i]=0;
      s[0]=2;
      p=0;    //first p elements of s are primes, the rest are a sieve
      for(;s[p]<n;) {                  //s[p] is the pth prime
        for(i=s[p]*s[p]; i<n; i+=s[p]) //mark multiples of s[p]
          s[i]=1;
        p++;
        s[p]=s[p-1]+1;
        for(; s[p]<n && s[s[p]]; s[p]++); //find next prime (where s[p]==0)
      }
      ans=new Array(p);
      for(i=0;i<p;i++)
        ans[i]=s[i];
      return ans;
    }


    //does a single round of Miller-Rabin base b consider x to be a possible prime?
    //x is a bigInt, and b is an integer, with b<x
    function millerRabinInt(x,b) {
      if (mr_x1.length!=x.length) {
        mr_x1=dup(x);
        mr_r=dup(x);
        mr_a=dup(x);
      }

      copyInt_(mr_a,b);
      return millerRabin(x,mr_a);
    }

    //does a single round of Miller-Rabin base b consider x to be a possible prime?
    //x and b are bigInts with b<x
    function millerRabin(x,b) {
      var i,j,k,s;

      if (mr_x1.length!=x.length) {
        mr_x1=dup(x);
        mr_r=dup(x);
        mr_a=dup(x);
      }

      copy_(mr_a,b);
      copy_(mr_r,x);
      copy_(mr_x1,x);

      addInt_(mr_r,-1);
      addInt_(mr_x1,-1);

      //s=the highest power of two that divides mr_r
      k=0;
      for (i=0;i<mr_r.length;i++)
        for (j=1;j<mask;j<<=1)
          if (x[i] & j) {
            s=(k<mr_r.length+bpe ? k : 0);
             i=mr_r.length;
             j=mask;
          } else
            k++;

      if (s)
        rightShift_(mr_r,s);

      powMod_(mr_a,mr_r,x);

      if (!equalsInt(mr_a,1) && !equals(mr_a,mr_x1)) {
        j=1;
        while (j<=s-1 && !equals(mr_a,mr_x1)) {
          squareMod_(mr_a,x);
          if (equalsInt(mr_a,1)) {
            return 0;
          }
          j++;
        }
        if (!equals(mr_a,mr_x1)) {
          return 0;
        }
      }
      return 1;
    }

    //returns how many bits long the bigInt is, not counting leading zeros.
    function bitSize(x) {
      var j,z,w;
      for (j=x.length-1; (x[j]==0) && (j>0); j--);
      for (z=0,w=x[j]; w; (w>>=1),z++);
      z+=bpe*j;
      return z;
    }

    //return a copy of x with at least n elements, adding leading zeros if needed
    function expand(x,n) {
      var ans=int2bigInt(0,(x.length>n ? x.length : n)*bpe,0);
      copy_(ans,x);
      return ans;
    }

    //return a k-bit true random prime using Maurer's algorithm.
    function randTruePrime(k) {
      var ans=int2bigInt(0,k,0);
      randTruePrime_(ans,k);
      return trim(ans,1);
    }

    //return a k-bit random probable prime with probability of error < 2^-80
    function randProbPrime(k) {
      if (k>=600) return randProbPrimeRounds(k,2); //numbers from HAC table 4.3
      if (k>=550) return randProbPrimeRounds(k,4);
      if (k>=500) return randProbPrimeRounds(k,5);
      if (k>=400) return randProbPrimeRounds(k,6);
      if (k>=350) return randProbPrimeRounds(k,7);
      if (k>=300) return randProbPrimeRounds(k,9);
      if (k>=250) return randProbPrimeRounds(k,12); //numbers from HAC table 4.4
      if (k>=200) return randProbPrimeRounds(k,15);
      if (k>=150) return randProbPrimeRounds(k,18);
      if (k>=100) return randProbPrimeRounds(k,27);
                  return randProbPrimeRounds(k,40); //number from HAC remark 4.26 (only an estimate)
    }

    //return a k-bit probable random prime using n rounds of Miller Rabin (after trial division with small primes)
    function randProbPrimeRounds(k,n) {
      var ans, i, divisible, B;
      B=30000;  //B is largest prime to use in trial division
      ans=int2bigInt(0,k,0);

      //optimization: try larger and smaller B to find the best limit.

      if (primes.length==0)
        primes=findPrimes(30000);  //check for divisibility by primes <=30000

      if (rpprb.length!=ans.length)
        rpprb=dup(ans);

      for (;;) { //keep trying random values for ans until one appears to be prime
        //optimization: pick a random number times L=2*3*5*...*p, plus a
        //   random element of the list of all numbers in [0,L) not divisible by any prime up to p.
        //   This can reduce the amount of random number generation.

        randBigInt_(ans,k,0); //ans = a random odd number to check
        ans[0] |= 1;
        divisible=0;

        //check ans for divisibility by small primes up to B
        for (i=0; (i<primes.length) && (primes[i]<=B); i++)
          if (modInt(ans,primes[i])==0 && !equalsInt(ans,primes[i])) {
            divisible=1;
            break;
          }

        //optimization: change millerRabin so the base can be bigger than the number being checked, then eliminate the while here.

        //do n rounds of Miller Rabin, with random bases less than ans
        for (i=0; i<n && !divisible; i++) {
          randBigInt_(rpprb,k,0);
          while(!greater(ans,rpprb)) //pick a random rpprb that's < ans
            randBigInt_(rpprb,k,0);
          if (!millerRabin(ans,rpprb))
            divisible=1;
        }

        if(!divisible)
          return ans;
      }
    }

    //return a new bigInt equal to (x mod n) for bigInts x and n.
    function mod(x,n) {
      var ans=dup(x);
      mod_(ans,n);
      return trim(ans,1);
    }

    //return (x+n) where x is a bigInt and n is an integer.
    function addInt(x,n) {
      var ans=expand(x,x.length+1);
      addInt_(ans,n);
      return trim(ans,1);
    }

    //return x*y for bigInts x and y. This is faster when y<x.
    function mult(x,y) {
      var ans=expand(x,x.length+y.length);
      mult_(ans,y);
      return trim(ans,1);
    }

    //return (x**y mod n) where x,y,n are bigInts and ** is exponentiation.  0**0=1. Faster for odd n.
    function powMod(x,y,n) {
      var ans=expand(x,n.length);
      powMod_(ans,trim(y,2),trim(n,2),0);  //this should work without the trim, but doesn't
      return trim(ans,1);
    }

    //return (x-y) for bigInts x and y.  Negative answers will be 2s complement
    function sub(x,y) {
      var ans=expand(x,(x.length>y.length ? x.length+1 : y.length+1));
      sub_(ans,y);
      return trim(ans,1);
    }

    //return (x+y) for bigInts x and y.
    function add(x,y) {
      var ans=expand(x,(x.length>y.length ? x.length+1 : y.length+1));
      add_(ans,y);
      return trim(ans,1);
    }

    //return (x**(-1) mod n) for bigInts x and n.  If no inverse exists, it returns null
    function inverseMod(x,n) {
      var ans=expand(x,n.length);
      var s;
      s=inverseMod_(ans,n);
      return s ? trim(ans,1) : null;
    }

    //return (x*y mod n) for bigInts x,y,n.  For greater speed, let y<x.
    function multMod(x,y,n) {
      var ans=expand(x,n.length);
      multMod_(ans,y,n);
      return trim(ans,1);
    }

    //generate a k-bit true random prime using Maurer's algorithm,
    //and put it into ans.  The bigInt ans must be large enough to hold it.
    function randTruePrime_(ans,k) {
      var c,m,pm,dd,j,r,B,divisible,z,zz,recSize;

      if (primes.length==0)
        primes=findPrimes(30000);  //check for divisibility by primes <=30000

      if (pows.length==0) {
        pows=new Array(512);
        for (j=0;j<512;j++) {
          pows[j]=Math.pow(2,j/511.-1.);
        }
      }

      //c and m should be tuned for a particular machine and value of k, to maximize speed
      c=0.1;  //c=0.1 in HAC
      m=20;   //generate this k-bit number by first recursively generating a number that has between k/2 and k-m bits
      var recLimit=20; //stop recursion when k <=recLimit.  Must have recLimit >= 2

      if (s_i2.length!=ans.length) {
        s_i2=dup(ans);
        s_R =dup(ans);
        s_n1=dup(ans);
        s_r2=dup(ans);
        s_d =dup(ans);
        s_x1=dup(ans);
        s_x2=dup(ans);
        s_b =dup(ans);
        s_n =dup(ans);
        s_i =dup(ans);
        s_rm=dup(ans);
        s_q =dup(ans);
        s_a =dup(ans);
        s_aa=dup(ans);
      }

      if (k <= recLimit) {  //generate small random primes by trial division up to its square root
        pm=(1<<((k+2)>>1))-1; //pm is binary number with all ones, just over sqrt(2^k)
        copyInt_(ans,0);
        for (dd=1;dd;) {
          dd=0;
          ans[0]= 1 | (1<<(k-1)) | Math.floor(trueRandom()*(1<<k));  //random, k-bit, odd integer, with msb 1
          for (j=1;(j<primes.length) && ((primes[j]&pm)==primes[j]);j++) { //trial division by all primes 3...sqrt(2^k)
            if (0==(ans[0]%primes[j])) {
              dd=1;
              break;
            }
          }
        }
        carry_(ans);
        return;
      }

      B=c*k*k;    //try small primes up to B (or all the primes[] array if the largest is less than B).
      if (k>2*m)  //generate this k-bit number by first recursively generating a number that has between k/2 and k-m bits
        for (r=1; k-k*r<=m; )
          r=pows[Math.floor(trueRandom()*512)];   //r=Math.pow(2,Math.random()-1);
      else
        r=.5;

      //simulation suggests the more complex algorithm using r=.333 is only slightly faster.

      recSize=Math.floor(r*k)+1;

      randTruePrime_(s_q,recSize);
      copyInt_(s_i2,0);
      s_i2[Math.floor((k-2)/bpe)] |= (1<<((k-2)%bpe));   //s_i2=2^(k-2)
      divide_(s_i2,s_q,s_i,s_rm);                        //s_i=floor((2^(k-1))/(2q))

      z=bitSize(s_i);

      for (;;) {
        for (;;) {  //generate z-bit numbers until one falls in the range [0,s_i-1]
          randBigInt_(s_R,z,0);
          if (greater(s_i,s_R))
            break;
        }                //now s_R is in the range [0,s_i-1]
        addInt_(s_R,1);  //now s_R is in the range [1,s_i]
        add_(s_R,s_i);   //now s_R is in the range [s_i+1,2*s_i]

        copy_(s_n,s_q);
        mult_(s_n,s_R);
        multInt_(s_n,2);
        addInt_(s_n,1);    //s_n=2*s_R*s_q+1

        copy_(s_r2,s_R);
        multInt_(s_r2,2);  //s_r2=2*s_R

        //check s_n for divisibility by small primes up to B
        for (divisible=0,j=0; (j<primes.length) && (primes[j]<B); j++)
          if (modInt(s_n,primes[j])==0 && !equalsInt(s_n,primes[j])) {
            divisible=1;
            break;
          }

        if (!divisible)    //if it passes small primes check, then try a single Miller-Rabin base 2
          if (!millerRabinInt(s_n,2)) //this line represents 75% of the total runtime for randTruePrime_
            divisible=1;

        if (!divisible) {  //if it passes that test, continue checking s_n
          addInt_(s_n,-3);
          for (j=s_n.length-1;(s_n[j]==0) && (j>0); j--);  //strip leading zeros
          for (zz=0,w=s_n[j]; w; (w>>=1),zz++);
          zz+=bpe*j;                             //zz=number of bits in s_n, ignoring leading zeros
          for (;;) {  //generate z-bit numbers until one falls in the range [0,s_n-1]
            randBigInt_(s_a,zz,0);
            if (greater(s_n,s_a))
              break;
          }                //now s_a is in the range [0,s_n-1]
          addInt_(s_n,3);  //now s_a is in the range [0,s_n-4]
          addInt_(s_a,2);  //now s_a is in the range [2,s_n-2]
          copy_(s_b,s_a);
          copy_(s_n1,s_n);
          addInt_(s_n1,-1);
          powMod_(s_b,s_n1,s_n);   //s_b=s_a^(s_n-1) modulo s_n
          addInt_(s_b,-1);
          if (isZero(s_b)) {
            copy_(s_b,s_a);
            powMod_(s_b,s_r2,s_n);
            addInt_(s_b,-1);
            copy_(s_aa,s_n);
            copy_(s_d,s_b);
            GCD_(s_d,s_n);  //if s_b and s_n are relatively prime, then s_n is a prime
            if (equalsInt(s_d,1)) {
              copy_(ans,s_aa);
              return;     //if we've made it this far, then s_n is absolutely guaranteed to be prime
            }
          }
        }
      }
    }

    //Return an n-bit random BigInt (n>=1).  If s=1, then the most significant of those n bits is set to 1.
    function randBigInt(n,s) {
      var a,b;
      a=Math.floor((n-1)/bpe)+2; //# array elements to hold the BigInt with a leading 0 element
      b=int2bigInt(0,0,a);
      randBigInt_(b,n,s);
      return b;
    }

    //Set b to an n-bit random BigInt.  If s=1, then the most significant of those n bits is set to 1.
    //Array b must be big enough to hold the result. Must have n>=1
    function randBigInt_(b,n,s) {
      var i,a;
      for (i=0;i<b.length;i++)
        b[i]=0;
      a=Math.floor((n-1)/bpe)+1; //# array elements to hold the BigInt
      for (i=0;i<a;i++) {
        b[i]=Math.floor(trueRandom()*(1<<(bpe-1)));
      }
      b[a-1] &= (2<<((n-1)%bpe))-1;
      if (s==1)
        b[a-1] |= (1<<((n-1)%bpe));
    }

    //Return the greatest common divisor of bigInts x and y (each with same number of elements).
    function GCD(x,y) {
      var xc,yc;
      xc=dup(x);
      yc=dup(y);
      GCD_(xc,yc);
      return xc;
    }

    //set x to the greatest common divisor of bigInts x and y (each with same number of elements).
    //y is destroyed.
    function GCD_(x,y) {
      var i,xp,yp,A,B,C,D,q,sing;
      if (T.length!=x.length)
        T=dup(x);

      sing=1;
      while (sing) { //while y has nonzero elements other than y[0]
        sing=0;
        for (i=1;i<y.length;i++) //check if y has nonzero elements other than 0
          if (y[i]) {
            sing=1;
            break;
          }
        if (!sing) break; //quit when y all zero elements except possibly y[0]

        for (i=x.length;!x[i] && i>=0;i--);  //find most significant element of x
        xp=x[i];
        yp=y[i];
        A=1; B=0; C=0; D=1;
        while ((yp+C) && (yp+D)) {
          q =Math.floor((xp+A)/(yp+C));
          var qp=Math.floor((xp+B)/(yp+D));
          if (q!=qp)
            break;
          t= A-q*C;   A=C;   C=t;    //  do (A,B,xp, C,D,yp) = (C,D,yp, A,B,xp) - q*(0,0,0, C,D,yp)
          t= B-q*D;   B=D;   D=t;
          t=xp-q*yp; xp=yp; yp=t;
        }
        if (B) {
          copy_(T,x);
          linComb_(x,y,A,B); //x=A*x+B*y
          linComb_(y,T,D,C); //y=D*y+C*T
        } else {
          mod_(x,y);
          copy_(T,x);
          copy_(x,y);
          copy_(y,T);
        }
      }
      if (y[0]==0)
        return;
      t=modInt(x,y[0]);
      copyInt_(x,y[0]);
      y[0]=t;
      while (y[0]) {
        x[0]%=y[0];
        t=x[0]; x[0]=y[0]; y[0]=t;
      }
    }

    //do x=x**(-1) mod n, for bigInts x and n.
    //If no inverse exists, it sets x to zero and returns 0, else it returns 1.
    //The x array must be at least as large as the n array.
    function inverseMod_(x,n) {
      var k=1+2*Math.max(x.length,n.length);

      if(!(x[0]&1)  && !(n[0]&1)) {  //if both inputs are even, then inverse doesn't exist
        copyInt_(x,0);
        return 0;
      }

      if (eg_u.length!=k) {
        eg_u=new Array(k);
        eg_v=new Array(k);
        eg_A=new Array(k);
        eg_B=new Array(k);
        eg_C=new Array(k);
        eg_D=new Array(k);
      }

      copy_(eg_u,x);
      copy_(eg_v,n);
      copyInt_(eg_A,1);
      copyInt_(eg_B,0);
      copyInt_(eg_C,0);
      copyInt_(eg_D,1);
      for (;;) {
        while(!(eg_u[0]&1)) {  //while eg_u is even
          halve_(eg_u);
          if (!(eg_A[0]&1) && !(eg_B[0]&1)) { //if eg_A==eg_B==0 mod 2
            halve_(eg_A);
            halve_(eg_B);
          } else {
            add_(eg_A,n);  halve_(eg_A);
            sub_(eg_B,x);  halve_(eg_B);
          }
        }

        while (!(eg_v[0]&1)) {  //while eg_v is even
          halve_(eg_v);
          if (!(eg_C[0]&1) && !(eg_D[0]&1)) { //if eg_C==eg_D==0 mod 2
            halve_(eg_C);
            halve_(eg_D);
          } else {
            add_(eg_C,n);  halve_(eg_C);
            sub_(eg_D,x);  halve_(eg_D);
          }
        }

        if (!greater(eg_v,eg_u)) { //eg_v <= eg_u
          sub_(eg_u,eg_v);
          sub_(eg_A,eg_C);
          sub_(eg_B,eg_D);
        } else {                   //eg_v > eg_u
          sub_(eg_v,eg_u);
          sub_(eg_C,eg_A);
          sub_(eg_D,eg_B);
        }

        if (equalsInt(eg_u,0)) {
          while (negative(eg_C)) //make sure answer is nonnegative
            add_(eg_C,n);
          copy_(x,eg_C);

          if (!equalsInt(eg_v,1)) { //if GCD_(x,n)!=1, then there is no inverse
            copyInt_(x,0);
            return 0;
          }
          return 1;
        }
      }
    }

    //return x**(-1) mod n, for integers x and n.  Return 0 if there is no inverse
    function inverseModInt(x,n) {
      var a=1,b=0,t;
      for (;;) {
        if (x==1) return a;
        if (x==0) return 0;
        b-=a*Math.floor(n/x);
        n%=x;

        if (n==1) return b; //to avoid negatives, change this b to n-b, and each -= to +=
        if (n==0) return 0;
        a-=b*Math.floor(x/n);
        x%=n;
      }
    }

    //this deprecated function is for backward compatibility only.
    function inverseModInt_(x,n) {
       return inverseModInt(x,n);
    }


    //Given positive bigInts x and y, change the bigints v, a, and b to positive bigInts such that:
    //     v = GCD_(x,y) = a*x-b*y
    //The bigInts v, a, b, must have exactly as many elements as the larger of x and y.
    function eGCD_(x,y,v,a,b) {
      var g=0;
      var k=Math.max(x.length,y.length);
      if (eg_u.length!=k) {
        eg_u=new Array(k);
        eg_A=new Array(k);
        eg_B=new Array(k);
        eg_C=new Array(k);
        eg_D=new Array(k);
      }
      while(!(x[0]&1)  && !(y[0]&1)) {  //while x and y both even
        halve_(x);
        halve_(y);
        g++;
      }
      copy_(eg_u,x);
      copy_(v,y);
      copyInt_(eg_A,1);
      copyInt_(eg_B,0);
      copyInt_(eg_C,0);
      copyInt_(eg_D,1);
      for (;;) {
        while(!(eg_u[0]&1)) {  //while u is even
          halve_(eg_u);
          if (!(eg_A[0]&1) && !(eg_B[0]&1)) { //if A==B==0 mod 2
            halve_(eg_A);
            halve_(eg_B);
          } else {
            add_(eg_A,y);  halve_(eg_A);
            sub_(eg_B,x);  halve_(eg_B);
          }
        }

        while (!(v[0]&1)) {  //while v is even
          halve_(v);
          if (!(eg_C[0]&1) && !(eg_D[0]&1)) { //if C==D==0 mod 2
            halve_(eg_C);
            halve_(eg_D);
          } else {
            add_(eg_C,y);  halve_(eg_C);
            sub_(eg_D,x);  halve_(eg_D);
          }
        }

        if (!greater(v,eg_u)) { //v<=u
          sub_(eg_u,v);
          sub_(eg_A,eg_C);
          sub_(eg_B,eg_D);
        } else {                //v>u
          sub_(v,eg_u);
          sub_(eg_C,eg_A);
          sub_(eg_D,eg_B);
        }
        if (equalsInt(eg_u,0)) {
          while (negative(eg_C)) {   //make sure a (C) is nonnegative
            add_(eg_C,y);
            sub_(eg_D,x);
          }
          multInt_(eg_D,-1);  ///make sure b (D) is nonnegative
          copy_(a,eg_C);
          copy_(b,eg_D);
          leftShift_(v,g);
          return;
        }
      }
    }


    //is bigInt x negative?
    function negative(x) {
      return ((x[x.length-1]>>(bpe-1))&1);
    }


    //is (x << (shift*bpe)) > y?
    //x and y are nonnegative bigInts
    //shift is a nonnegative integer
    function greaterShift(x,y,shift) {
      var i, kx=x.length, ky=y.length;
      var k=((kx+shift)<ky) ? (kx+shift) : ky;
      for (i=ky-1-shift; i<kx && i>=0; i++)
        if (x[i]>0)
          return 1; //if there are nonzeros in x to the left of the first column of y, then x is bigger
      for (i=kx-1+shift; i<ky; i++)
        if (y[i]>0)
          return 0; //if there are nonzeros in y to the left of the first column of x, then x is not bigger
      for (i=k-1; i>=shift; i--)
        if      (x[i-shift]>y[i]) return 1;
        else if (x[i-shift]<y[i]) return 0;
      return 0;
    }

    //is x > y? (x and y both nonnegative)
    function greater(x,y) {
      var i;
      var k=(x.length<y.length) ? x.length : y.length;

      for (i=x.length;i<y.length;i++)
        if (y[i])
          return 0;  //y has more digits

      for (i=y.length;i<x.length;i++)
        if (x[i])
          return 1;  //x has more digits

      for (i=k-1;i>=0;i--)
        if (x[i]>y[i])
          return 1;
        else if (x[i]<y[i])
          return 0;
      return 0;
    }

    //divide x by y giving quotient q and remainder r.  (q=floor(x/y),  r=x mod y).  All 4 are bigints.
    //x must have at least one leading zero element.
    //y must be nonzero.
    //q and r must be arrays that are exactly the same length as x. (Or q can have more).
    //Must have x.length >= y.length >= 2.
    function divide_(x,y,q,r) {
      var kx, ky;
      var i,j,y1,y2,c,a,b;
      copy_(r,x);
      for (ky=y.length;y[ky-1]==0;ky--); //ky is number of elements in y, not including leading zeros

      //normalize: ensure the most significant element of y has its highest bit set
      b=y[ky-1];
      for (a=0; b; a++)
        b>>=1;
      a=bpe-a;  //a is how many bits to shift so that the high order bit of y is leftmost in its array element
      leftShift_(y,a);  //multiply both by 1<<a now, then divide both by that at the end
      leftShift_(r,a);

      //Rob Visser discovered a bug: the following line was originally just before the normalization.
      for (kx=r.length;r[kx-1]==0 && kx>ky;kx--); //kx is number of elements in normalized x, not including leading zeros

      copyInt_(q,0);                      // q=0
      while (!greaterShift(y,r,kx-ky)) {  // while (leftShift_(y,kx-ky) <= r) {
        subShift_(r,y,kx-ky);             //   r=r-leftShift_(y,kx-ky)
        q[kx-ky]++;                       //   q[kx-ky]++;
      }                                   // }

      for (i=kx-1; i>=ky; i--) {
        if (r[i]==y[ky-1])
          q[i-ky]=mask;
        else
          q[i-ky]=Math.floor((r[i]*radix+r[i-1])/y[ky-1]);

        //The following for(;;) loop is equivalent to the commented while loop,
        //except that the uncommented version avoids overflow.
        //The commented loop comes from HAC, which assumes r[-1]==y[-1]==0
        //  while (q[i-ky]*(y[ky-1]*radix+y[ky-2]) > r[i]*radix*radix+r[i-1]*radix+r[i-2])
        //    q[i-ky]--;
        for (;;) {
          y2=(ky>1 ? y[ky-2] : 0)*q[i-ky];
          c=y2>>bpe;
          y2=y2 & mask;
          y1=c+q[i-ky]*y[ky-1];
          c=y1>>bpe;
          y1=y1 & mask;

          if (c==r[i] ? y1==r[i-1] ? y2>(i>1 ? r[i-2] : 0) : y1>r[i-1] : c>r[i])
            q[i-ky]--;
          else
            break;
        }

        linCombShift_(r,y,-q[i-ky],i-ky);    //r=r-q[i-ky]*leftShift_(y,i-ky)
        if (negative(r)) {
          addShift_(r,y,i-ky);         //r=r+leftShift_(y,i-ky)
          q[i-ky]--;
        }
      }

      rightShift_(y,a);  //undo the normalization step
      rightShift_(r,a);  //undo the normalization step
    }

    //do carries and borrows so each element of the bigInt x fits in bpe bits.
    function carry_(x) {
      var i,k,c,b;
      k=x.length;
      c=0;
      for (i=0;i<k;i++) {
        c+=x[i];
        b=0;
        if (c<0) {
          b=-(c>>bpe);
          c+=b*radix;
        }
        x[i]=c & mask;
        c=(c>>bpe)-b;
      }
    }

    //return x mod n for bigInt x and integer n.
    function modInt(x,n) {
      var i,c=0;
      for (i=x.length-1; i>=0; i--)
        c=(c*radix+x[i])%n;
      return c;
    }

    //convert the integer t into a bigInt with at least the given number of bits.
    //the returned array stores the bigInt in bpe-bit chunks, little endian (buff[0] is least significant word)
    //Pad the array with leading zeros so that it has at least minSize elements.
    //There will always be at least one leading 0 element.
    function int2bigInt(t,bits,minSize) {
      var i,k;
      k=Math.ceil(bits/bpe)+1;
      k=minSize>k ? minSize : k;
      var buff=new Array(k);
      copyInt_(buff,t);
      return buff;
    }

    //return the bigInt given a string representation in a given base.
    //Pad the array with leading zeros so that it has at least minSize elements.
    //If base=-1, then it reads in a space-separated list of array elements in decimal.
    //The array will always have at least one leading zero, unless base=-1.
    function str2bigInt(s,b,minSize) {
      var d, i, j, base, str, x, y, kk;
      if (typeof b === 'string') {
          base = b.length;
          str = b;
      } else {
          base = b;
          str = digitsStr;
      }
      var k=s.length;
      if (base==-1) { //comma-separated list of array elements in decimal
        x=new Array(0);
        for (;;) {
          y=new Array(x.length+1);
          for (i=0;i<x.length;i++)
            y[i+1]=x[i];
          y[0]=parseInt(s,10);
          x=y;
          d=s.indexOf(',',0);
          if (d<1)
            break;
          s=s.substring(d+1);
          if (s.length==0)
            break;
        }
        if (x.length<minSize) {
          y=new Array(minSize);
          copy_(y,x);
          return y;
        }
        return x;
      }

      x=int2bigInt(0,base*k,0);
    for (i=0;i<k;i++) {
      d=str.indexOf(s.substring(i,i+1),0);
      if (base<=36 && d>=36) { //convert lowercase to uppercase if base<=36
        d-=26;
      }
      if (d>=base || d<0) {   //ignore illegal characters
      continue;
        }
        multInt_(x,base);
        addInt_(x,d);
      }

      for (k=x.length;k>0 && !x[k-1];k--); //strip off leading zeros
      k=minSize>k+1 ? minSize : k+1;
      y=new Array(k);
      kk=k<x.length ? k : x.length;
      for (i=0;i<kk;i++)
        y[i]=x[i];
      for (;i<k;i++)
        y[i]=0;
      return y;
    }

    //is bigint x equal to integer y?
    //y must have less than bpe bits
    function equalsInt(x,y) {
      var i;
      if (x[0]!=y)
        return 0;
      for (i=1;i<x.length;i++)
        if (x[i])
          return 0;
      return 1;
    }

    //are bigints x and y equal?
    //this works even if x and y are different lengths and have arbitrarily many leading zeros
    function equals(x,y) {
      var i;
      var k=x.length<y.length ? x.length : y.length;
      for (i=0;i<k;i++)
        if (x[i]!=y[i])
          return 0;
      if (x.length>y.length) {
        for (;i<x.length;i++)
          if (x[i])
            return 0;
      } else {
        for (;i<y.length;i++)
          if (y[i])
            return 0;
      }
      return 1;
    }

    //is the bigInt x equal to zero?
    function isZero(x) {
      var i;
      for (i=0;i<x.length;i++)
        if (x[i])
          return 0;
      return 1;
    }

    //convert a bigInt into a string in a given base, from base 2 up to base 95.
    //Base -1 prints the contents of the array representing the number.
    function bigInt2str(x,b) {
      var i,t,base,str,s="";
      if (typeof b === 'string') {
          base = b.length;
          str = b;
      } else {
          base = b;
          str = digitsStr;
      }

      if (s6.length!=x.length)
        s6=dup(x);
      else
        copy_(s6,x);

      if (base==-1) { //return the list of array contents
        for (i=x.length-1;i>0;i--)
          s+=x[i]+',';
        s+=x[0];
      }
      else { //return it in the given base
        while (!isZero(s6)) {
          t=divInt_(s6,base);  //t=s6 % base; s6=floor(s6/base);
      s=str.substring(t,t+1)+s;
        }
      }
      if (s.length==0)
    s=str[0];
      return s;
    }

    //returns a duplicate of bigInt x
    function dup(x) {
      var i;
      var buff=new Array(x.length);
      copy_(buff,x);
      return buff;
    }

    //do x=y on bigInts x and y.  x must be an array at least as big as y (not counting the leading zeros in y).
    function copy_(x,y) {
      var i;
      var k=x.length<y.length ? x.length : y.length;
      for (i=0;i<k;i++)
        x[i]=y[i];
      for (i=k;i<x.length;i++)
        x[i]=0;
    }

    //do x=y on bigInt x and integer y.
    function copyInt_(x,n) {
      var i,c;
      for (c=n,i=0;i<x.length;i++) {
        x[i]=c & mask;
        c>>=bpe;
      }
    }

    //do x=x+n where x is a bigInt and n is an integer.
    //x must be large enough to hold the result.
    function addInt_(x,n) {
      var i,k,c,b;
      x[0]+=n;
      k=x.length;
      c=0;
      for (i=0;i<k;i++) {
        c+=x[i];
        b=0;
        if (c<0) {
          b=-(c>>bpe);
          c+=b*radix;
        }
        x[i]=c & mask;
        c=(c>>bpe)-b;
        if (!c) return; //stop carrying as soon as the carry is zero
      }
    }

    //right shift bigInt x by n bits.  0 <= n < bpe.
    function rightShift_(x,n) {
      var i;
      var k=Math.floor(n/bpe);
      if (k) {
        for (i=0;i<x.length-k;i++) //right shift x by k elements
          x[i]=x[i+k];
        for (;i<x.length;i++)
          x[i]=0;
        n%=bpe;
      }
      for (i=0;i<x.length-1;i++) {
        x[i]=mask & ((x[i+1]<<(bpe-n)) | (x[i]>>n));
      }
      x[i]>>=n;
    }

    //do x=floor(|x|/2)*sgn(x) for bigInt x in 2's complement
    function halve_(x) {
      var i;
      for (i=0;i<x.length-1;i++) {
        x[i]=mask & ((x[i+1]<<(bpe-1)) | (x[i]>>1));
      }
      x[i]=(x[i]>>1) | (x[i] & (radix>>1));  //most significant bit stays the same
    }

    //left shift bigInt x by n bits.
    function leftShift_(x,n) {
      var i;
      var k=Math.floor(n/bpe);
      if (k) {
        for (i=x.length; i>=k; i--) //left shift x by k elements
          x[i]=x[i-k];
        for (;i>=0;i--)
          x[i]=0;
        n%=bpe;
      }
      if (!n)
        return;
      for (i=x.length-1;i>0;i--) {
        x[i]=mask & ((x[i]<<n) | (x[i-1]>>(bpe-n)));
      }
      x[i]=mask & (x[i]<<n);
    }

    //do x=x*n where x is a bigInt and n is an integer.
    //x must be large enough to hold the result.
    function multInt_(x,n) {
      var i,k,c,b;
      if (!n)
        return;
      k=x.length;
      c=0;
      for (i=0;i<k;i++) {
        c+=x[i]*n;
        b=0;
        if (c<0) {
          b=-(c>>bpe);
          c+=b*radix;
        }
        x[i]=c & mask;
        c=(c>>bpe)-b;
      }
    }

    //do x=floor(x/n) for bigInt x and integer n, and return the remainder
    function divInt_(x,n) {
      var i,r=0,s;
      for (i=x.length-1;i>=0;i--) {
        s=r*radix+x[i];
        x[i]=Math.floor(s/n);
        r=s%n;
      }
      return r;
    }

    //do the linear combination x=a*x+b*y for bigInts x and y, and integers a and b.
    //x must be large enough to hold the answer.
    function linComb_(x,y,a,b) {
      var i,c,k,kk;
      k=x.length<y.length ? x.length : y.length;
      kk=x.length;
      for (c=0,i=0;i<k;i++) {
        c+=a*x[i]+b*y[i];
        x[i]=c & mask;
        c>>=bpe;
      }
      for (i=k;i<kk;i++) {
        c+=a*x[i];
        x[i]=c & mask;
        c>>=bpe;
      }
    }

    //do the linear combination x=a*x+b*(y<<(ys*bpe)) for bigInts x and y, and integers a, b and ys.
    //x must be large enough to hold the answer.
    function linCombShift_(x,y,b,ys) {
      var i,c,k,kk;
      k=x.length<ys+y.length ? x.length : ys+y.length;
      kk=x.length;
      for (c=0,i=ys;i<k;i++) {
        c+=x[i]+b*y[i-ys];
        x[i]=c & mask;
        c>>=bpe;
      }
      for (i=k;c && i<kk;i++) {
        c+=x[i];
        x[i]=c & mask;
        c>>=bpe;
      }
    }

    //do x=x+(y<<(ys*bpe)) for bigInts x and y, and integer ys.
    //x must be large enough to hold the answer.
    function addShift_(x,y,ys) {
      var i,c,k,kk;
      k=x.length<ys+y.length ? x.length : ys+y.length;
      kk=x.length;
      for (c=0,i=ys;i<k;i++) {
        c+=x[i]+y[i-ys];
        x[i]=c & mask;
        c>>=bpe;
      }
      for (i=k;c && i<kk;i++) {
        c+=x[i];
        x[i]=c & mask;
        c>>=bpe;
      }
    }

    //do x=x-(y<<(ys*bpe)) for bigInts x and y, and integer ys.
    //x must be large enough to hold the answer.
    function subShift_(x,y,ys) {
      var i,c,k,kk;
      k=x.length<ys+y.length ? x.length : ys+y.length;
      kk=x.length;
      for (c=0,i=ys;i<k;i++) {
        c+=x[i]-y[i-ys];
        x[i]=c & mask;
        c>>=bpe;
      }
      for (i=k;c && i<kk;i++) {
        c+=x[i];
        x[i]=c & mask;
        c>>=bpe;
      }
    }

    //do x=x-y for bigInts x and y.
    //x must be large enough to hold the answer.
    //negative answers will be 2s complement
    function sub_(x,y) {
      var i,c,k,kk;
      k=x.length<y.length ? x.length : y.length;
      for (c=0,i=0;i<k;i++) {
        c+=x[i]-y[i];
        x[i]=c & mask;
        c>>=bpe;
      }
      for (i=k;c && i<x.length;i++) {
        c+=x[i];
        x[i]=c & mask;
        c>>=bpe;
      }
    }

    //do x=x+y for bigInts x and y.
    //x must be large enough to hold the answer.
    function add_(x,y) {
      var i,c,k,kk;
      k=x.length<y.length ? x.length : y.length;
      for (c=0,i=0;i<k;i++) {
        c+=x[i]+y[i];
        x[i]=c & mask;
        c>>=bpe;
      }
      for (i=k;c && i<x.length;i++) {
        c+=x[i];
        x[i]=c & mask;
        c>>=bpe;
      }
    }

    //do x=x*y for bigInts x and y.  This is faster when y<x.
    function mult_(x,y) {
      var i;
      if (ss.length!=2*x.length)
        ss=new Array(2*x.length);
      copyInt_(ss,0);
      for (i=0;i<y.length;i++)
        if (y[i])
          linCombShift_(ss,x,y[i],i);   //ss=1*ss+y[i]*(x<<(i*bpe))
      copy_(x,ss);
    }

    //do x=x mod n for bigInts x and n.
    function mod_(x,n) {
      if (s4.length!=x.length)
        s4=dup(x);
      else
        copy_(s4,x);
      if (s5.length!=x.length)
        s5=dup(x);
      divide_(s4,n,s5,x);  //x = remainder of s4 / n
    }

    //do x=x*y mod n for bigInts x,y,n.
    //for greater speed, let y<x.
    function multMod_(x,y,n) {
      var i;
      if (s0.length!=2*x.length)
        s0=new Array(2*x.length);
      copyInt_(s0,0);
      for (i=0;i<y.length;i++)
        if (y[i])
          linCombShift_(s0,x,y[i],i);   //s0=1*s0+y[i]*(x<<(i*bpe))
      mod_(s0,n);
      copy_(x,s0);
    }

    //do x=x*x mod n for bigInts x,n.
    function squareMod_(x,n) {
      var i,j,d,c,kx,kn,k;
      for (kx=x.length; kx>0 && !x[kx-1]; kx--);  //ignore leading zeros in x
      k=kx>n.length ? 2*kx : 2*n.length; //k=# elements in the product, which is twice the elements in the larger of x and n
      if (s0.length!=k)
        s0=new Array(k);
      copyInt_(s0,0);
      for (i=0;i<kx;i++) {
        c=s0[2*i]+x[i]*x[i];
        s0[2*i]=c & mask;
        c>>=bpe;
        for (j=i+1;j<kx;j++) {
          c=s0[i+j]+2*x[i]*x[j]+c;
          s0[i+j]=(c & mask);
          c>>=bpe;
        }
        s0[i+kx]=c;
      }
      mod_(s0,n);
      copy_(x,s0);
    }

    //return x with exactly k leading zero elements
    function trim(x,k) {
      var i,y;
      for (i=x.length; i>0 && !x[i-1]; i--);
      y=new Array(i+k);
      copy_(y,x);
      return y;
    }

    //do x=x**y mod n, where x,y,n are bigInts and ** is exponentiation.  0**0=1.
    //this is faster when n is odd.  x usually needs to have as many elements as n.
    function powMod_(x,y,n) {
      var k1,k2,kn,np;
      if(s7.length!=n.length)
        s7=dup(n);

      //for even modulus, use a simple square-and-multiply algorithm,
      //rather than using the more complex Montgomery algorithm.
      if ((n[0]&1)==0) {
        copy_(s7,x);
        copyInt_(x,1);
        while(!equalsInt(y,0)) {
          if (y[0]&1)
            multMod_(x,s7,n);
          divInt_(y,2);
          squareMod_(s7,n);
        }
        return;
      }

      //calculate np from n for the Montgomery multiplications
      copyInt_(s7,0);
      for (kn=n.length;kn>0 && !n[kn-1];kn--);
      np=radix-inverseModInt(modInt(n,radix),radix);
      s7[kn]=1;
      multMod_(x ,s7,n);   // x = x * 2**(kn*bp) mod n

      if (s3.length!=x.length)
        s3=dup(x);
      else
        copy_(s3,x);

      for (k1=y.length-1;k1>0 & !y[k1]; k1--);  //k1=first nonzero element of y
      if (y[k1]==0) {  //anything to the 0th power is 1
        copyInt_(x,1);
        return;
      }
      for (k2=1<<(bpe-1);k2 && !(y[k1] & k2); k2>>=1);  //k2=position of first 1 bit in y[k1]
      for (;;) {
        if (!(k2>>=1)) {  //look at next bit of y
          k1--;
          if (k1<0) {
            mont_(x,one,n,np);
            return;
          }
          k2=1<<(bpe-1);
        }
        mont_(x,x,n,np);

        if (k2 & y[k1]) //if next bit is a 1
          mont_(x,s3,n,np);
      }
    }


    //do x=x*y*Ri mod n for bigInts x,y,n,
    //  where Ri = 2**(-kn*bpe) mod n, and kn is the
    //  number of elements in the n array, not
    //  counting leading zeros.
    //x array must have at least as many elemnts as the n array
    //It's OK if x and y are the same variable.
    //must have:
    //  x,y < n
    //  n is odd
    //  np = -(n^(-1)) mod radix
    function mont_(x,y,n,np) {
      var i,j,c,ui,t,ks;
      var kn=n.length;
      var ky=y.length;

      if (sa.length!=kn)
        sa=new Array(kn);

      copyInt_(sa,0);

      for (;kn>0 && n[kn-1]==0;kn--); //ignore leading zeros of n
      for (;ky>0 && y[ky-1]==0;ky--); //ignore leading zeros of y
      ks=sa.length-1; //sa will never have more than this many nonzero elements.

      //the following loop consumes 95% of the runtime for randTruePrime_() and powMod_() for large numbers
      for (i=0; i<kn; i++) {
        t=sa[0]+x[i]*y[0];
        ui=((t & mask) * np) & mask;  //the inner "& mask" was needed on Safari (but not MSIE) at one time
        c=(t+ui*n[0]) >> bpe;
        t=x[i];

        //do sa=(sa+x[i]*y+ui*n)/b   where b=2**bpe.  Loop is unrolled 5-fold for speed
        j=1;
        for (;j<ky-4;) { c+=sa[j]+ui*n[j]+t*y[j];   sa[j-1]=c & mask;   c>>=bpe;   j++;
                         c+=sa[j]+ui*n[j]+t*y[j];   sa[j-1]=c & mask;   c>>=bpe;   j++;
                         c+=sa[j]+ui*n[j]+t*y[j];   sa[j-1]=c & mask;   c>>=bpe;   j++;
                         c+=sa[j]+ui*n[j]+t*y[j];   sa[j-1]=c & mask;   c>>=bpe;   j++;
                         c+=sa[j]+ui*n[j]+t*y[j];   sa[j-1]=c & mask;   c>>=bpe;   j++; }
        for (;j<ky;)   { c+=sa[j]+ui*n[j]+t*y[j];   sa[j-1]=c & mask;   c>>=bpe;   j++; }
        for (;j<kn-4;) { c+=sa[j]+ui*n[j];          sa[j-1]=c & mask;   c>>=bpe;   j++;
                         c+=sa[j]+ui*n[j];          sa[j-1]=c & mask;   c>>=bpe;   j++;
                         c+=sa[j]+ui*n[j];          sa[j-1]=c & mask;   c>>=bpe;   j++;
                         c+=sa[j]+ui*n[j];          sa[j-1]=c & mask;   c>>=bpe;   j++;
                         c+=sa[j]+ui*n[j];          sa[j-1]=c & mask;   c>>=bpe;   j++; }
        for (;j<kn;)   { c+=sa[j]+ui*n[j];          sa[j-1]=c & mask;   c>>=bpe;   j++; }
        for (;j<ks;)   { c+=sa[j];                  sa[j-1]=c & mask;   c>>=bpe;   j++; }
        sa[j-1]=c & mask;
      }

      if (!greater(n,sa))
        sub_(sa,n);
      copy_(x,sa);
    }

    module.exports = {
        'add': add,
        'addInt': addInt,
        'bigInt2str': bigInt2str,
        'bitSize': bitSize,
        'dup': dup,
        'equals': equals,
        'equalsInt': equalsInt,
        'expand': expand,
        'findPrimes': findPrimes,
        'GCD': GCD,
        'greater': greater,
        'greaterShift': greaterShift,
        'int2bigInt': int2bigInt,
        'inverseMod': inverseMod,
        'inverseModInt': inverseModInt,
        'isZero': isZero,
        'millerRabin': millerRabin,
        'millerRabinInt': millerRabinInt,
        'mod': mod,
        'modInt': modInt,
        'mult': mult,
        'multMod': multMod,
        'negative': negative,
        'powMod': powMod,
        'randBigInt': randBigInt,
        'randTruePrime': randTruePrime,
        'randProbPrime': randProbPrime,
        'str2bigInt': str2bigInt,
        'sub': sub,
        'trim': trim,
        'addInt_': addInt_,
        'add_': add_,
        'copy_': copy_,
        'copyInt_': copyInt_,
        'GCD_': GCD_,
        'inverseMod_': inverseMod_,
        'mod_': mod_,
        'mult_': mult_,
        'multMod_': multMod_,
        'powMod_': powMod_,
        'randBigInt_': randBigInt_,
        'randTruePrime_': randTruePrime_,
        'sub_': sub_,
        'addShift_': addShift_,
        'carry_': carry_,
        'divide_': divide_,
        'divInt_': divInt_,
        'eGCD_': eGCD_,
        'halve_': halve_,
        'leftShift_': leftShift_,
        'linComb_': linComb_,
        'linCombShift_': linCombShift_,
        'mont_': mont_,
        'multInt_': multInt_,
        'rightShift_': rightShift_,
        'squareMod_': squareMod_,
        'subShift_': subShift_,
    };

});

/***/ }),

/***/ "./node_modules/lseqtree/node_modules/BigInt/src sync recursive":
/*!*************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/BigInt/src/ sync ***!
  \*************************************************************/
/***/ ((module) => {

function webpackEmptyContext(req) {
	var e = new Error("Cannot find module '" + req + "'");
	e.code = 'MODULE_NOT_FOUND';
	throw e;
}
webpackEmptyContext.keys = () => ([]);
webpackEmptyContext.resolve = webpackEmptyContext;
webpackEmptyContext.id = "./node_modules/lseqtree/node_modules/BigInt/src sync recursive";
module.exports = webpackEmptyContext;

/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_Hash.js":
/*!************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_Hash.js ***!
  \************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var hashClear = __webpack_require__(/*! ./_hashClear */ "./node_modules/lseqtree/node_modules/lodash/_hashClear.js"),
    hashDelete = __webpack_require__(/*! ./_hashDelete */ "./node_modules/lseqtree/node_modules/lodash/_hashDelete.js"),
    hashGet = __webpack_require__(/*! ./_hashGet */ "./node_modules/lseqtree/node_modules/lodash/_hashGet.js"),
    hashHas = __webpack_require__(/*! ./_hashHas */ "./node_modules/lseqtree/node_modules/lodash/_hashHas.js"),
    hashSet = __webpack_require__(/*! ./_hashSet */ "./node_modules/lseqtree/node_modules/lodash/_hashSet.js");

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `Hash`.
Hash.prototype.clear = hashClear;
Hash.prototype['delete'] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;

module.exports = Hash;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_ListCache.js":
/*!*****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_ListCache.js ***!
  \*****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var listCacheClear = __webpack_require__(/*! ./_listCacheClear */ "./node_modules/lseqtree/node_modules/lodash/_listCacheClear.js"),
    listCacheDelete = __webpack_require__(/*! ./_listCacheDelete */ "./node_modules/lseqtree/node_modules/lodash/_listCacheDelete.js"),
    listCacheGet = __webpack_require__(/*! ./_listCacheGet */ "./node_modules/lseqtree/node_modules/lodash/_listCacheGet.js"),
    listCacheHas = __webpack_require__(/*! ./_listCacheHas */ "./node_modules/lseqtree/node_modules/lodash/_listCacheHas.js"),
    listCacheSet = __webpack_require__(/*! ./_listCacheSet */ "./node_modules/lseqtree/node_modules/lodash/_listCacheSet.js");

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `ListCache`.
ListCache.prototype.clear = listCacheClear;
ListCache.prototype['delete'] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;

module.exports = ListCache;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_Map.js":
/*!***********************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_Map.js ***!
  \***********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var getNative = __webpack_require__(/*! ./_getNative */ "./node_modules/lseqtree/node_modules/lodash/_getNative.js"),
    root = __webpack_require__(/*! ./_root */ "./node_modules/lseqtree/node_modules/lodash/_root.js");

/* Built-in method references that are verified to be native. */
var Map = getNative(root, 'Map');

module.exports = Map;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_MapCache.js":
/*!****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_MapCache.js ***!
  \****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var mapCacheClear = __webpack_require__(/*! ./_mapCacheClear */ "./node_modules/lseqtree/node_modules/lodash/_mapCacheClear.js"),
    mapCacheDelete = __webpack_require__(/*! ./_mapCacheDelete */ "./node_modules/lseqtree/node_modules/lodash/_mapCacheDelete.js"),
    mapCacheGet = __webpack_require__(/*! ./_mapCacheGet */ "./node_modules/lseqtree/node_modules/lodash/_mapCacheGet.js"),
    mapCacheHas = __webpack_require__(/*! ./_mapCacheHas */ "./node_modules/lseqtree/node_modules/lodash/_mapCacheHas.js"),
    mapCacheSet = __webpack_require__(/*! ./_mapCacheSet */ "./node_modules/lseqtree/node_modules/lodash/_mapCacheSet.js");

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `MapCache`.
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

module.exports = MapCache;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_Stack.js":
/*!*************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_Stack.js ***!
  \*************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var ListCache = __webpack_require__(/*! ./_ListCache */ "./node_modules/lseqtree/node_modules/lodash/_ListCache.js"),
    stackClear = __webpack_require__(/*! ./_stackClear */ "./node_modules/lseqtree/node_modules/lodash/_stackClear.js"),
    stackDelete = __webpack_require__(/*! ./_stackDelete */ "./node_modules/lseqtree/node_modules/lodash/_stackDelete.js"),
    stackGet = __webpack_require__(/*! ./_stackGet */ "./node_modules/lseqtree/node_modules/lodash/_stackGet.js"),
    stackHas = __webpack_require__(/*! ./_stackHas */ "./node_modules/lseqtree/node_modules/lodash/_stackHas.js"),
    stackSet = __webpack_require__(/*! ./_stackSet */ "./node_modules/lseqtree/node_modules/lodash/_stackSet.js");

/**
 * Creates a stack cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Stack(entries) {
  var data = this.__data__ = new ListCache(entries);
  this.size = data.size;
}

// Add methods to `Stack`.
Stack.prototype.clear = stackClear;
Stack.prototype['delete'] = stackDelete;
Stack.prototype.get = stackGet;
Stack.prototype.has = stackHas;
Stack.prototype.set = stackSet;

module.exports = Stack;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_Symbol.js":
/*!**************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_Symbol.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var root = __webpack_require__(/*! ./_root */ "./node_modules/lseqtree/node_modules/lodash/_root.js");

/** Built-in value references. */
var Symbol = root.Symbol;

module.exports = Symbol;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_Uint8Array.js":
/*!******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_Uint8Array.js ***!
  \******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var root = __webpack_require__(/*! ./_root */ "./node_modules/lseqtree/node_modules/lodash/_root.js");

/** Built-in value references. */
var Uint8Array = root.Uint8Array;

module.exports = Uint8Array;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_apply.js":
/*!*************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_apply.js ***!
  \*************************************************************/
/***/ ((module) => {

/**
 * A faster alternative to `Function#apply`, this function invokes `func`
 * with the `this` binding of `thisArg` and the arguments of `args`.
 *
 * @private
 * @param {Function} func The function to invoke.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {Array} args The arguments to invoke `func` with.
 * @returns {*} Returns the result of `func`.
 */
function apply(func, thisArg, args) {
  switch (args.length) {
    case 0: return func.call(thisArg);
    case 1: return func.call(thisArg, args[0]);
    case 2: return func.call(thisArg, args[0], args[1]);
    case 3: return func.call(thisArg, args[0], args[1], args[2]);
  }
  return func.apply(thisArg, args);
}

module.exports = apply;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_arrayLikeKeys.js":
/*!*********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_arrayLikeKeys.js ***!
  \*********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var baseTimes = __webpack_require__(/*! ./_baseTimes */ "./node_modules/lseqtree/node_modules/lodash/_baseTimes.js"),
    isArguments = __webpack_require__(/*! ./isArguments */ "./node_modules/lseqtree/node_modules/lodash/isArguments.js"),
    isArray = __webpack_require__(/*! ./isArray */ "./node_modules/lseqtree/node_modules/lodash/isArray.js"),
    isBuffer = __webpack_require__(/*! ./isBuffer */ "./node_modules/lseqtree/node_modules/lodash/isBuffer.js"),
    isIndex = __webpack_require__(/*! ./_isIndex */ "./node_modules/lseqtree/node_modules/lodash/_isIndex.js"),
    isTypedArray = __webpack_require__(/*! ./isTypedArray */ "./node_modules/lseqtree/node_modules/lodash/isTypedArray.js");

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Creates an array of the enumerable property names of the array-like `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @param {boolean} inherited Specify returning inherited property names.
 * @returns {Array} Returns the array of property names.
 */
function arrayLikeKeys(value, inherited) {
  var isArr = isArray(value),
      isArg = !isArr && isArguments(value),
      isBuff = !isArr && !isArg && isBuffer(value),
      isType = !isArr && !isArg && !isBuff && isTypedArray(value),
      skipIndexes = isArr || isArg || isBuff || isType,
      result = skipIndexes ? baseTimes(value.length, String) : [],
      length = result.length;

  for (var key in value) {
    if ((inherited || hasOwnProperty.call(value, key)) &&
        !(skipIndexes && (
           // Safari 9 has enumerable `arguments.length` in strict mode.
           key == 'length' ||
           // Node.js 0.10 has enumerable non-index properties on buffers.
           (isBuff && (key == 'offset' || key == 'parent')) ||
           // PhantomJS 2 has enumerable non-index properties on typed arrays.
           (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
           // Skip index properties.
           isIndex(key, length)
        ))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = arrayLikeKeys;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_assignMergeValue.js":
/*!************************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_assignMergeValue.js ***!
  \************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var baseAssignValue = __webpack_require__(/*! ./_baseAssignValue */ "./node_modules/lseqtree/node_modules/lodash/_baseAssignValue.js"),
    eq = __webpack_require__(/*! ./eq */ "./node_modules/lseqtree/node_modules/lodash/eq.js");

/**
 * This function is like `assignValue` except that it doesn't assign
 * `undefined` values.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function assignMergeValue(object, key, value) {
  if ((value !== undefined && !eq(object[key], value)) ||
      (value === undefined && !(key in object))) {
    baseAssignValue(object, key, value);
  }
}

module.exports = assignMergeValue;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_assignValue.js":
/*!*******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_assignValue.js ***!
  \*******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var baseAssignValue = __webpack_require__(/*! ./_baseAssignValue */ "./node_modules/lseqtree/node_modules/lodash/_baseAssignValue.js"),
    eq = __webpack_require__(/*! ./eq */ "./node_modules/lseqtree/node_modules/lodash/eq.js");

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Assigns `value` to `key` of `object` if the existing value is not equivalent
 * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * for equality comparisons.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function assignValue(object, key, value) {
  var objValue = object[key];
  if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) ||
      (value === undefined && !(key in object))) {
    baseAssignValue(object, key, value);
  }
}

module.exports = assignValue;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_assocIndexOf.js":
/*!********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_assocIndexOf.js ***!
  \********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var eq = __webpack_require__(/*! ./eq */ "./node_modules/lseqtree/node_modules/lodash/eq.js");

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

module.exports = assocIndexOf;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_baseAssignValue.js":
/*!***********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_baseAssignValue.js ***!
  \***********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var defineProperty = __webpack_require__(/*! ./_defineProperty */ "./node_modules/lseqtree/node_modules/lodash/_defineProperty.js");

/**
 * The base implementation of `assignValue` and `assignMergeValue` without
 * value checks.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function baseAssignValue(object, key, value) {
  if (key == '__proto__' && defineProperty) {
    defineProperty(object, key, {
      'configurable': true,
      'enumerable': true,
      'value': value,
      'writable': true
    });
  } else {
    object[key] = value;
  }
}

module.exports = baseAssignValue;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_baseCreate.js":
/*!******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_baseCreate.js ***!
  \******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isObject = __webpack_require__(/*! ./isObject */ "./node_modules/lseqtree/node_modules/lodash/isObject.js");

/** Built-in value references. */
var objectCreate = Object.create;

/**
 * The base implementation of `_.create` without support for assigning
 * properties to the created object.
 *
 * @private
 * @param {Object} proto The object to inherit from.
 * @returns {Object} Returns the new object.
 */
var baseCreate = (function() {
  function object() {}
  return function(proto) {
    if (!isObject(proto)) {
      return {};
    }
    if (objectCreate) {
      return objectCreate(proto);
    }
    object.prototype = proto;
    var result = new object;
    object.prototype = undefined;
    return result;
  };
}());

module.exports = baseCreate;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_baseFor.js":
/*!***************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_baseFor.js ***!
  \***************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var createBaseFor = __webpack_require__(/*! ./_createBaseFor */ "./node_modules/lseqtree/node_modules/lodash/_createBaseFor.js");

/**
 * The base implementation of `baseForOwn` which iterates over `object`
 * properties returned by `keysFunc` and invokes `iteratee` for each property.
 * Iteratee functions may exit iteration early by explicitly returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

module.exports = baseFor;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_baseGetTag.js":
/*!******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_baseGetTag.js ***!
  \******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var Symbol = __webpack_require__(/*! ./_Symbol */ "./node_modules/lseqtree/node_modules/lodash/_Symbol.js"),
    getRawTag = __webpack_require__(/*! ./_getRawTag */ "./node_modules/lseqtree/node_modules/lodash/_getRawTag.js"),
    objectToString = __webpack_require__(/*! ./_objectToString */ "./node_modules/lseqtree/node_modules/lodash/_objectToString.js");

/** `Object#toString` result references. */
var nullTag = '[object Null]',
    undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

module.exports = baseGetTag;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_baseIsArguments.js":
/*!***********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_baseIsArguments.js ***!
  \***********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var baseGetTag = __webpack_require__(/*! ./_baseGetTag */ "./node_modules/lseqtree/node_modules/lodash/_baseGetTag.js"),
    isObjectLike = __webpack_require__(/*! ./isObjectLike */ "./node_modules/lseqtree/node_modules/lodash/isObjectLike.js");

/** `Object#toString` result references. */
var argsTag = '[object Arguments]';

/**
 * The base implementation of `_.isArguments`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 */
function baseIsArguments(value) {
  return isObjectLike(value) && baseGetTag(value) == argsTag;
}

module.exports = baseIsArguments;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_baseIsNative.js":
/*!********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_baseIsNative.js ***!
  \********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isFunction = __webpack_require__(/*! ./isFunction */ "./node_modules/lseqtree/node_modules/lodash/isFunction.js"),
    isMasked = __webpack_require__(/*! ./_isMasked */ "./node_modules/lseqtree/node_modules/lodash/_isMasked.js"),
    isObject = __webpack_require__(/*! ./isObject */ "./node_modules/lseqtree/node_modules/lodash/isObject.js"),
    toSource = __webpack_require__(/*! ./_toSource */ "./node_modules/lseqtree/node_modules/lodash/_toSource.js");

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used for built-in method references. */
var funcProto = Function.prototype,
    objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }
  var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

module.exports = baseIsNative;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_baseIsTypedArray.js":
/*!************************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_baseIsTypedArray.js ***!
  \************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var baseGetTag = __webpack_require__(/*! ./_baseGetTag */ "./node_modules/lseqtree/node_modules/lodash/_baseGetTag.js"),
    isLength = __webpack_require__(/*! ./isLength */ "./node_modules/lseqtree/node_modules/lodash/isLength.js"),
    isObjectLike = __webpack_require__(/*! ./isObjectLike */ "./node_modules/lseqtree/node_modules/lodash/isObjectLike.js");

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag = '[object DataView]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
typedArrayTags[dataViewTag] = typedArrayTags[dateTag] =
typedArrayTags[errorTag] = typedArrayTags[funcTag] =
typedArrayTags[mapTag] = typedArrayTags[numberTag] =
typedArrayTags[objectTag] = typedArrayTags[regexpTag] =
typedArrayTags[setTag] = typedArrayTags[stringTag] =
typedArrayTags[weakMapTag] = false;

/**
 * The base implementation of `_.isTypedArray` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 */
function baseIsTypedArray(value) {
  return isObjectLike(value) &&
    isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
}

module.exports = baseIsTypedArray;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_baseKeysIn.js":
/*!******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_baseKeysIn.js ***!
  \******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isObject = __webpack_require__(/*! ./isObject */ "./node_modules/lseqtree/node_modules/lodash/isObject.js"),
    isPrototype = __webpack_require__(/*! ./_isPrototype */ "./node_modules/lseqtree/node_modules/lodash/_isPrototype.js"),
    nativeKeysIn = __webpack_require__(/*! ./_nativeKeysIn */ "./node_modules/lseqtree/node_modules/lodash/_nativeKeysIn.js");

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * The base implementation of `_.keysIn` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeysIn(object) {
  if (!isObject(object)) {
    return nativeKeysIn(object);
  }
  var isProto = isPrototype(object),
      result = [];

  for (var key in object) {
    if (!(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = baseKeysIn;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_baseMerge.js":
/*!*****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_baseMerge.js ***!
  \*****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var Stack = __webpack_require__(/*! ./_Stack */ "./node_modules/lseqtree/node_modules/lodash/_Stack.js"),
    assignMergeValue = __webpack_require__(/*! ./_assignMergeValue */ "./node_modules/lseqtree/node_modules/lodash/_assignMergeValue.js"),
    baseFor = __webpack_require__(/*! ./_baseFor */ "./node_modules/lseqtree/node_modules/lodash/_baseFor.js"),
    baseMergeDeep = __webpack_require__(/*! ./_baseMergeDeep */ "./node_modules/lseqtree/node_modules/lodash/_baseMergeDeep.js"),
    isObject = __webpack_require__(/*! ./isObject */ "./node_modules/lseqtree/node_modules/lodash/isObject.js"),
    keysIn = __webpack_require__(/*! ./keysIn */ "./node_modules/lseqtree/node_modules/lodash/keysIn.js");

/**
 * The base implementation of `_.merge` without support for multiple sources.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {number} srcIndex The index of `source`.
 * @param {Function} [customizer] The function to customize merged values.
 * @param {Object} [stack] Tracks traversed source values and their merged
 *  counterparts.
 */
function baseMerge(object, source, srcIndex, customizer, stack) {
  if (object === source) {
    return;
  }
  baseFor(source, function(srcValue, key) {
    if (isObject(srcValue)) {
      stack || (stack = new Stack);
      baseMergeDeep(object, source, key, srcIndex, baseMerge, customizer, stack);
    }
    else {
      var newValue = customizer
        ? customizer(object[key], srcValue, (key + ''), object, source, stack)
        : undefined;

      if (newValue === undefined) {
        newValue = srcValue;
      }
      assignMergeValue(object, key, newValue);
    }
  }, keysIn);
}

module.exports = baseMerge;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_baseMergeDeep.js":
/*!*********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_baseMergeDeep.js ***!
  \*********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var assignMergeValue = __webpack_require__(/*! ./_assignMergeValue */ "./node_modules/lseqtree/node_modules/lodash/_assignMergeValue.js"),
    cloneBuffer = __webpack_require__(/*! ./_cloneBuffer */ "./node_modules/lseqtree/node_modules/lodash/_cloneBuffer.js"),
    cloneTypedArray = __webpack_require__(/*! ./_cloneTypedArray */ "./node_modules/lseqtree/node_modules/lodash/_cloneTypedArray.js"),
    copyArray = __webpack_require__(/*! ./_copyArray */ "./node_modules/lseqtree/node_modules/lodash/_copyArray.js"),
    initCloneObject = __webpack_require__(/*! ./_initCloneObject */ "./node_modules/lseqtree/node_modules/lodash/_initCloneObject.js"),
    isArguments = __webpack_require__(/*! ./isArguments */ "./node_modules/lseqtree/node_modules/lodash/isArguments.js"),
    isArray = __webpack_require__(/*! ./isArray */ "./node_modules/lseqtree/node_modules/lodash/isArray.js"),
    isArrayLikeObject = __webpack_require__(/*! ./isArrayLikeObject */ "./node_modules/lseqtree/node_modules/lodash/isArrayLikeObject.js"),
    isBuffer = __webpack_require__(/*! ./isBuffer */ "./node_modules/lseqtree/node_modules/lodash/isBuffer.js"),
    isFunction = __webpack_require__(/*! ./isFunction */ "./node_modules/lseqtree/node_modules/lodash/isFunction.js"),
    isObject = __webpack_require__(/*! ./isObject */ "./node_modules/lseqtree/node_modules/lodash/isObject.js"),
    isPlainObject = __webpack_require__(/*! ./isPlainObject */ "./node_modules/lseqtree/node_modules/lodash/isPlainObject.js"),
    isTypedArray = __webpack_require__(/*! ./isTypedArray */ "./node_modules/lseqtree/node_modules/lodash/isTypedArray.js"),
    toPlainObject = __webpack_require__(/*! ./toPlainObject */ "./node_modules/lseqtree/node_modules/lodash/toPlainObject.js");

/**
 * A specialized version of `baseMerge` for arrays and objects which performs
 * deep merges and tracks traversed objects enabling objects with circular
 * references to be merged.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {string} key The key of the value to merge.
 * @param {number} srcIndex The index of `source`.
 * @param {Function} mergeFunc The function to merge values.
 * @param {Function} [customizer] The function to customize assigned values.
 * @param {Object} [stack] Tracks traversed source values and their merged
 *  counterparts.
 */
function baseMergeDeep(object, source, key, srcIndex, mergeFunc, customizer, stack) {
  var objValue = object[key],
      srcValue = source[key],
      stacked = stack.get(srcValue);

  if (stacked) {
    assignMergeValue(object, key, stacked);
    return;
  }
  var newValue = customizer
    ? customizer(objValue, srcValue, (key + ''), object, source, stack)
    : undefined;

  var isCommon = newValue === undefined;

  if (isCommon) {
    var isArr = isArray(srcValue),
        isBuff = !isArr && isBuffer(srcValue),
        isTyped = !isArr && !isBuff && isTypedArray(srcValue);

    newValue = srcValue;
    if (isArr || isBuff || isTyped) {
      if (isArray(objValue)) {
        newValue = objValue;
      }
      else if (isArrayLikeObject(objValue)) {
        newValue = copyArray(objValue);
      }
      else if (isBuff) {
        isCommon = false;
        newValue = cloneBuffer(srcValue, true);
      }
      else if (isTyped) {
        isCommon = false;
        newValue = cloneTypedArray(srcValue, true);
      }
      else {
        newValue = [];
      }
    }
    else if (isPlainObject(srcValue) || isArguments(srcValue)) {
      newValue = objValue;
      if (isArguments(objValue)) {
        newValue = toPlainObject(objValue);
      }
      else if (!isObject(objValue) || (srcIndex && isFunction(objValue))) {
        newValue = initCloneObject(srcValue);
      }
    }
    else {
      isCommon = false;
    }
  }
  if (isCommon) {
    // Recursively merge objects and arrays (susceptible to call stack limits).
    stack.set(srcValue, newValue);
    mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
    stack['delete'](srcValue);
  }
  assignMergeValue(object, key, newValue);
}

module.exports = baseMergeDeep;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_baseRest.js":
/*!****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_baseRest.js ***!
  \****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var identity = __webpack_require__(/*! ./identity */ "./node_modules/lseqtree/node_modules/lodash/identity.js"),
    overRest = __webpack_require__(/*! ./_overRest */ "./node_modules/lseqtree/node_modules/lodash/_overRest.js"),
    setToString = __webpack_require__(/*! ./_setToString */ "./node_modules/lseqtree/node_modules/lodash/_setToString.js");

/**
 * The base implementation of `_.rest` which doesn't validate or coerce arguments.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 */
function baseRest(func, start) {
  return setToString(overRest(func, start, identity), func + '');
}

module.exports = baseRest;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_baseSetToString.js":
/*!***********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_baseSetToString.js ***!
  \***********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var constant = __webpack_require__(/*! ./constant */ "./node_modules/lseqtree/node_modules/lodash/constant.js"),
    defineProperty = __webpack_require__(/*! ./_defineProperty */ "./node_modules/lseqtree/node_modules/lodash/_defineProperty.js"),
    identity = __webpack_require__(/*! ./identity */ "./node_modules/lseqtree/node_modules/lodash/identity.js");

/**
 * The base implementation of `setToString` without support for hot loop shorting.
 *
 * @private
 * @param {Function} func The function to modify.
 * @param {Function} string The `toString` result.
 * @returns {Function} Returns `func`.
 */
var baseSetToString = !defineProperty ? identity : function(func, string) {
  return defineProperty(func, 'toString', {
    'configurable': true,
    'enumerable': false,
    'value': constant(string),
    'writable': true
  });
};

module.exports = baseSetToString;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_baseTimes.js":
/*!*****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_baseTimes.js ***!
  \*****************************************************************/
/***/ ((module) => {

/**
 * The base implementation of `_.times` without support for iteratee shorthands
 * or max array length checks.
 *
 * @private
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the array of results.
 */
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);

  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}

module.exports = baseTimes;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_baseUnary.js":
/*!*****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_baseUnary.js ***!
  \*****************************************************************/
/***/ ((module) => {

/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}

module.exports = baseUnary;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_cloneArrayBuffer.js":
/*!************************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_cloneArrayBuffer.js ***!
  \************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var Uint8Array = __webpack_require__(/*! ./_Uint8Array */ "./node_modules/lseqtree/node_modules/lodash/_Uint8Array.js");

/**
 * Creates a clone of `arrayBuffer`.
 *
 * @private
 * @param {ArrayBuffer} arrayBuffer The array buffer to clone.
 * @returns {ArrayBuffer} Returns the cloned array buffer.
 */
function cloneArrayBuffer(arrayBuffer) {
  var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
  new Uint8Array(result).set(new Uint8Array(arrayBuffer));
  return result;
}

module.exports = cloneArrayBuffer;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_cloneBuffer.js":
/*!*******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_cloneBuffer.js ***!
  \*******************************************************************/
/***/ ((module, exports, __webpack_require__) => {

/* module decorator */ module = __webpack_require__.nmd(module);
var root = __webpack_require__(/*! ./_root */ "./node_modules/lseqtree/node_modules/lodash/_root.js");

/** Detect free variable `exports`. */
var freeExports =  true && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && "object" == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Built-in value references. */
var Buffer = moduleExports ? root.Buffer : undefined,
    allocUnsafe = Buffer ? Buffer.allocUnsafe : undefined;

/**
 * Creates a clone of  `buffer`.
 *
 * @private
 * @param {Buffer} buffer The buffer to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Buffer} Returns the cloned buffer.
 */
function cloneBuffer(buffer, isDeep) {
  if (isDeep) {
    return buffer.slice();
  }
  var length = buffer.length,
      result = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);

  buffer.copy(result);
  return result;
}

module.exports = cloneBuffer;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_cloneTypedArray.js":
/*!***********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_cloneTypedArray.js ***!
  \***********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var cloneArrayBuffer = __webpack_require__(/*! ./_cloneArrayBuffer */ "./node_modules/lseqtree/node_modules/lodash/_cloneArrayBuffer.js");

/**
 * Creates a clone of `typedArray`.
 *
 * @private
 * @param {Object} typedArray The typed array to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the cloned typed array.
 */
function cloneTypedArray(typedArray, isDeep) {
  var buffer = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
  return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
}

module.exports = cloneTypedArray;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_copyArray.js":
/*!*****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_copyArray.js ***!
  \*****************************************************************/
/***/ ((module) => {

/**
 * Copies the values of `source` to `array`.
 *
 * @private
 * @param {Array} source The array to copy values from.
 * @param {Array} [array=[]] The array to copy values to.
 * @returns {Array} Returns `array`.
 */
function copyArray(source, array) {
  var index = -1,
      length = source.length;

  array || (array = Array(length));
  while (++index < length) {
    array[index] = source[index];
  }
  return array;
}

module.exports = copyArray;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_copyObject.js":
/*!******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_copyObject.js ***!
  \******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var assignValue = __webpack_require__(/*! ./_assignValue */ "./node_modules/lseqtree/node_modules/lodash/_assignValue.js"),
    baseAssignValue = __webpack_require__(/*! ./_baseAssignValue */ "./node_modules/lseqtree/node_modules/lodash/_baseAssignValue.js");

/**
 * Copies properties of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy properties from.
 * @param {Array} props The property identifiers to copy.
 * @param {Object} [object={}] The object to copy properties to.
 * @param {Function} [customizer] The function to customize copied values.
 * @returns {Object} Returns `object`.
 */
function copyObject(source, props, object, customizer) {
  var isNew = !object;
  object || (object = {});

  var index = -1,
      length = props.length;

  while (++index < length) {
    var key = props[index];

    var newValue = customizer
      ? customizer(object[key], source[key], key, object, source)
      : undefined;

    if (newValue === undefined) {
      newValue = source[key];
    }
    if (isNew) {
      baseAssignValue(object, key, newValue);
    } else {
      assignValue(object, key, newValue);
    }
  }
  return object;
}

module.exports = copyObject;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_coreJsData.js":
/*!******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_coreJsData.js ***!
  \******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var root = __webpack_require__(/*! ./_root */ "./node_modules/lseqtree/node_modules/lodash/_root.js");

/** Used to detect overreaching core-js shims. */
var coreJsData = root['__core-js_shared__'];

module.exports = coreJsData;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_createAssigner.js":
/*!**********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_createAssigner.js ***!
  \**********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var baseRest = __webpack_require__(/*! ./_baseRest */ "./node_modules/lseqtree/node_modules/lodash/_baseRest.js"),
    isIterateeCall = __webpack_require__(/*! ./_isIterateeCall */ "./node_modules/lseqtree/node_modules/lodash/_isIterateeCall.js");

/**
 * Creates a function like `_.assign`.
 *
 * @private
 * @param {Function} assigner The function to assign values.
 * @returns {Function} Returns the new assigner function.
 */
function createAssigner(assigner) {
  return baseRest(function(object, sources) {
    var index = -1,
        length = sources.length,
        customizer = length > 1 ? sources[length - 1] : undefined,
        guard = length > 2 ? sources[2] : undefined;

    customizer = (assigner.length > 3 && typeof customizer == 'function')
      ? (length--, customizer)
      : undefined;

    if (guard && isIterateeCall(sources[0], sources[1], guard)) {
      customizer = length < 3 ? undefined : customizer;
      length = 1;
    }
    object = Object(object);
    while (++index < length) {
      var source = sources[index];
      if (source) {
        assigner(object, source, index, customizer);
      }
    }
    return object;
  });
}

module.exports = createAssigner;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_createBaseFor.js":
/*!*********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_createBaseFor.js ***!
  \*********************************************************************/
/***/ ((module) => {

/**
 * Creates a base function for methods like `_.forIn` and `_.forOwn`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var index = -1,
        iterable = Object(object),
        props = keysFunc(object),
        length = props.length;

    while (length--) {
      var key = props[fromRight ? length : ++index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

module.exports = createBaseFor;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_defineProperty.js":
/*!**********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_defineProperty.js ***!
  \**********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var getNative = __webpack_require__(/*! ./_getNative */ "./node_modules/lseqtree/node_modules/lodash/_getNative.js");

var defineProperty = (function() {
  try {
    var func = getNative(Object, 'defineProperty');
    func({}, '', {});
    return func;
  } catch (e) {}
}());

module.exports = defineProperty;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_freeGlobal.js":
/*!******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_freeGlobal.js ***!
  \******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof __webpack_require__.g == 'object' && __webpack_require__.g && __webpack_require__.g.Object === Object && __webpack_require__.g;

module.exports = freeGlobal;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_getMapData.js":
/*!******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_getMapData.js ***!
  \******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isKeyable = __webpack_require__(/*! ./_isKeyable */ "./node_modules/lseqtree/node_modules/lodash/_isKeyable.js");

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

module.exports = getMapData;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_getNative.js":
/*!*****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_getNative.js ***!
  \*****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var baseIsNative = __webpack_require__(/*! ./_baseIsNative */ "./node_modules/lseqtree/node_modules/lodash/_baseIsNative.js"),
    getValue = __webpack_require__(/*! ./_getValue */ "./node_modules/lseqtree/node_modules/lodash/_getValue.js");

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

module.exports = getNative;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_getPrototype.js":
/*!********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_getPrototype.js ***!
  \********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var overArg = __webpack_require__(/*! ./_overArg */ "./node_modules/lseqtree/node_modules/lodash/_overArg.js");

/** Built-in value references. */
var getPrototype = overArg(Object.getPrototypeOf, Object);

module.exports = getPrototype;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_getRawTag.js":
/*!*****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_getRawTag.js ***!
  \*****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var Symbol = __webpack_require__(/*! ./_Symbol */ "./node_modules/lseqtree/node_modules/lodash/_Symbol.js");

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/** Built-in value references. */
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag),
      tag = value[symToStringTag];

  try {
    value[symToStringTag] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag] = tag;
    } else {
      delete value[symToStringTag];
    }
  }
  return result;
}

module.exports = getRawTag;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_getValue.js":
/*!****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_getValue.js ***!
  \****************************************************************/
/***/ ((module) => {

/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

module.exports = getValue;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_hashClear.js":
/*!*****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_hashClear.js ***!
  \*****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var nativeCreate = __webpack_require__(/*! ./_nativeCreate */ "./node_modules/lseqtree/node_modules/lodash/_nativeCreate.js");

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = nativeCreate ? nativeCreate(null) : {};
  this.size = 0;
}

module.exports = hashClear;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_hashDelete.js":
/*!******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_hashDelete.js ***!
  \******************************************************************/
/***/ ((module) => {

/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  var result = this.has(key) && delete this.__data__[key];
  this.size -= result ? 1 : 0;
  return result;
}

module.exports = hashDelete;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_hashGet.js":
/*!***************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_hashGet.js ***!
  \***************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var nativeCreate = __webpack_require__(/*! ./_nativeCreate */ "./node_modules/lseqtree/node_modules/lodash/_nativeCreate.js");

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED ? undefined : result;
  }
  return hasOwnProperty.call(data, key) ? data[key] : undefined;
}

module.exports = hashGet;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_hashHas.js":
/*!***************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_hashHas.js ***!
  \***************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var nativeCreate = __webpack_require__(/*! ./_nativeCreate */ "./node_modules/lseqtree/node_modules/lodash/_nativeCreate.js");

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate ? (data[key] !== undefined) : hasOwnProperty.call(data, key);
}

module.exports = hashHas;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_hashSet.js":
/*!***************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_hashSet.js ***!
  \***************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var nativeCreate = __webpack_require__(/*! ./_nativeCreate */ "./node_modules/lseqtree/node_modules/lodash/_nativeCreate.js");

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  this.size += this.has(key) ? 0 : 1;
  data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
  return this;
}

module.exports = hashSet;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_initCloneObject.js":
/*!***********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_initCloneObject.js ***!
  \***********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var baseCreate = __webpack_require__(/*! ./_baseCreate */ "./node_modules/lseqtree/node_modules/lodash/_baseCreate.js"),
    getPrototype = __webpack_require__(/*! ./_getPrototype */ "./node_modules/lseqtree/node_modules/lodash/_getPrototype.js"),
    isPrototype = __webpack_require__(/*! ./_isPrototype */ "./node_modules/lseqtree/node_modules/lodash/_isPrototype.js");

/**
 * Initializes an object clone.
 *
 * @private
 * @param {Object} object The object to clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneObject(object) {
  return (typeof object.constructor == 'function' && !isPrototype(object))
    ? baseCreate(getPrototype(object))
    : {};
}

module.exports = initCloneObject;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_isIndex.js":
/*!***************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_isIndex.js ***!
  \***************************************************************/
/***/ ((module) => {

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  length = length == null ? MAX_SAFE_INTEGER : length;
  return !!length &&
    (typeof value == 'number' || reIsUint.test(value)) &&
    (value > -1 && value % 1 == 0 && value < length);
}

module.exports = isIndex;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_isIterateeCall.js":
/*!**********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_isIterateeCall.js ***!
  \**********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var eq = __webpack_require__(/*! ./eq */ "./node_modules/lseqtree/node_modules/lodash/eq.js"),
    isArrayLike = __webpack_require__(/*! ./isArrayLike */ "./node_modules/lseqtree/node_modules/lodash/isArrayLike.js"),
    isIndex = __webpack_require__(/*! ./_isIndex */ "./node_modules/lseqtree/node_modules/lodash/_isIndex.js"),
    isObject = __webpack_require__(/*! ./isObject */ "./node_modules/lseqtree/node_modules/lodash/isObject.js");

/**
 * Checks if the given arguments are from an iteratee call.
 *
 * @private
 * @param {*} value The potential iteratee value argument.
 * @param {*} index The potential iteratee index or key argument.
 * @param {*} object The potential iteratee object argument.
 * @returns {boolean} Returns `true` if the arguments are from an iteratee call,
 *  else `false`.
 */
function isIterateeCall(value, index, object) {
  if (!isObject(object)) {
    return false;
  }
  var type = typeof index;
  if (type == 'number'
        ? (isArrayLike(object) && isIndex(index, object.length))
        : (type == 'string' && index in object)
      ) {
    return eq(object[index], value);
  }
  return false;
}

module.exports = isIterateeCall;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_isKeyable.js":
/*!*****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_isKeyable.js ***!
  \*****************************************************************/
/***/ ((module) => {

/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

module.exports = isKeyable;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_isMasked.js":
/*!****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_isMasked.js ***!
  \****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var coreJsData = __webpack_require__(/*! ./_coreJsData */ "./node_modules/lseqtree/node_modules/lodash/_coreJsData.js");

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

module.exports = isMasked;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_isPrototype.js":
/*!*******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_isPrototype.js ***!
  \*******************************************************************/
/***/ ((module) => {

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Checks if `value` is likely a prototype object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
 */
function isPrototype(value) {
  var Ctor = value && value.constructor,
      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;

  return value === proto;
}

module.exports = isPrototype;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_listCacheClear.js":
/*!**********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_listCacheClear.js ***!
  \**********************************************************************/
/***/ ((module) => {

/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
  this.size = 0;
}

module.exports = listCacheClear;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_listCacheDelete.js":
/*!***********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_listCacheDelete.js ***!
  \***********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var assocIndexOf = __webpack_require__(/*! ./_assocIndexOf */ "./node_modules/lseqtree/node_modules/lodash/_assocIndexOf.js");

/** Used for built-in method references. */
var arrayProto = Array.prototype;

/** Built-in value references. */
var splice = arrayProto.splice;

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  --this.size;
  return true;
}

module.exports = listCacheDelete;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_listCacheGet.js":
/*!********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_listCacheGet.js ***!
  \********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var assocIndexOf = __webpack_require__(/*! ./_assocIndexOf */ "./node_modules/lseqtree/node_modules/lodash/_assocIndexOf.js");

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

module.exports = listCacheGet;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_listCacheHas.js":
/*!********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_listCacheHas.js ***!
  \********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var assocIndexOf = __webpack_require__(/*! ./_assocIndexOf */ "./node_modules/lseqtree/node_modules/lodash/_assocIndexOf.js");

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return assocIndexOf(this.__data__, key) > -1;
}

module.exports = listCacheHas;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_listCacheSet.js":
/*!********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_listCacheSet.js ***!
  \********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var assocIndexOf = __webpack_require__(/*! ./_assocIndexOf */ "./node_modules/lseqtree/node_modules/lodash/_assocIndexOf.js");

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    ++this.size;
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

module.exports = listCacheSet;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_mapCacheClear.js":
/*!*********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_mapCacheClear.js ***!
  \*********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var Hash = __webpack_require__(/*! ./_Hash */ "./node_modules/lseqtree/node_modules/lodash/_Hash.js"),
    ListCache = __webpack_require__(/*! ./_ListCache */ "./node_modules/lseqtree/node_modules/lodash/_ListCache.js"),
    Map = __webpack_require__(/*! ./_Map */ "./node_modules/lseqtree/node_modules/lodash/_Map.js");

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.size = 0;
  this.__data__ = {
    'hash': new Hash,
    'map': new (Map || ListCache),
    'string': new Hash
  };
}

module.exports = mapCacheClear;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_mapCacheDelete.js":
/*!**********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_mapCacheDelete.js ***!
  \**********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var getMapData = __webpack_require__(/*! ./_getMapData */ "./node_modules/lseqtree/node_modules/lodash/_getMapData.js");

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  var result = getMapData(this, key)['delete'](key);
  this.size -= result ? 1 : 0;
  return result;
}

module.exports = mapCacheDelete;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_mapCacheGet.js":
/*!*******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_mapCacheGet.js ***!
  \*******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var getMapData = __webpack_require__(/*! ./_getMapData */ "./node_modules/lseqtree/node_modules/lodash/_getMapData.js");

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return getMapData(this, key).get(key);
}

module.exports = mapCacheGet;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_mapCacheHas.js":
/*!*******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_mapCacheHas.js ***!
  \*******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var getMapData = __webpack_require__(/*! ./_getMapData */ "./node_modules/lseqtree/node_modules/lodash/_getMapData.js");

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return getMapData(this, key).has(key);
}

module.exports = mapCacheHas;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_mapCacheSet.js":
/*!*******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_mapCacheSet.js ***!
  \*******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var getMapData = __webpack_require__(/*! ./_getMapData */ "./node_modules/lseqtree/node_modules/lodash/_getMapData.js");

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  var data = getMapData(this, key),
      size = data.size;

  data.set(key, value);
  this.size += data.size == size ? 0 : 1;
  return this;
}

module.exports = mapCacheSet;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_nativeCreate.js":
/*!********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_nativeCreate.js ***!
  \********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var getNative = __webpack_require__(/*! ./_getNative */ "./node_modules/lseqtree/node_modules/lodash/_getNative.js");

/* Built-in method references that are verified to be native. */
var nativeCreate = getNative(Object, 'create');

module.exports = nativeCreate;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_nativeKeysIn.js":
/*!********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_nativeKeysIn.js ***!
  \********************************************************************/
/***/ ((module) => {

/**
 * This function is like
 * [`Object.keys`](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * except that it includes inherited enumerable properties.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function nativeKeysIn(object) {
  var result = [];
  if (object != null) {
    for (var key in Object(object)) {
      result.push(key);
    }
  }
  return result;
}

module.exports = nativeKeysIn;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_nodeUtil.js":
/*!****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_nodeUtil.js ***!
  \****************************************************************/
/***/ ((module, exports, __webpack_require__) => {

/* module decorator */ module = __webpack_require__.nmd(module);
var freeGlobal = __webpack_require__(/*! ./_freeGlobal */ "./node_modules/lseqtree/node_modules/lodash/_freeGlobal.js");

/** Detect free variable `exports`. */
var freeExports =  true && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && "object" == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Detect free variable `process` from Node.js. */
var freeProcess = moduleExports && freeGlobal.process;

/** Used to access faster Node.js helpers. */
var nodeUtil = (function() {
  try {
    return freeProcess && freeProcess.binding && freeProcess.binding('util');
  } catch (e) {}
}());

module.exports = nodeUtil;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_objectToString.js":
/*!**********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_objectToString.js ***!
  \**********************************************************************/
/***/ ((module) => {

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString.call(value);
}

module.exports = objectToString;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_overArg.js":
/*!***************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_overArg.js ***!
  \***************************************************************/
/***/ ((module) => {

/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

module.exports = overArg;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_overRest.js":
/*!****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_overRest.js ***!
  \****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var apply = __webpack_require__(/*! ./_apply */ "./node_modules/lseqtree/node_modules/lodash/_apply.js");

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * A specialized version of `baseRest` which transforms the rest array.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @param {Function} transform The rest array transform.
 * @returns {Function} Returns the new function.
 */
function overRest(func, start, transform) {
  start = nativeMax(start === undefined ? (func.length - 1) : start, 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        array = Array(length);

    while (++index < length) {
      array[index] = args[start + index];
    }
    index = -1;
    var otherArgs = Array(start + 1);
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = transform(array);
    return apply(func, this, otherArgs);
  };
}

module.exports = overRest;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_root.js":
/*!************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_root.js ***!
  \************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var freeGlobal = __webpack_require__(/*! ./_freeGlobal */ "./node_modules/lseqtree/node_modules/lodash/_freeGlobal.js");

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

module.exports = root;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_setToString.js":
/*!*******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_setToString.js ***!
  \*******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var baseSetToString = __webpack_require__(/*! ./_baseSetToString */ "./node_modules/lseqtree/node_modules/lodash/_baseSetToString.js"),
    shortOut = __webpack_require__(/*! ./_shortOut */ "./node_modules/lseqtree/node_modules/lodash/_shortOut.js");

/**
 * Sets the `toString` method of `func` to return `string`.
 *
 * @private
 * @param {Function} func The function to modify.
 * @param {Function} string The `toString` result.
 * @returns {Function} Returns `func`.
 */
var setToString = shortOut(baseSetToString);

module.exports = setToString;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_shortOut.js":
/*!****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_shortOut.js ***!
  \****************************************************************/
/***/ ((module) => {

/** Used to detect hot functions by number of calls within a span of milliseconds. */
var HOT_COUNT = 800,
    HOT_SPAN = 16;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeNow = Date.now;

/**
 * Creates a function that'll short out and invoke `identity` instead
 * of `func` when it's called `HOT_COUNT` or more times in `HOT_SPAN`
 * milliseconds.
 *
 * @private
 * @param {Function} func The function to restrict.
 * @returns {Function} Returns the new shortable function.
 */
function shortOut(func) {
  var count = 0,
      lastCalled = 0;

  return function() {
    var stamp = nativeNow(),
        remaining = HOT_SPAN - (stamp - lastCalled);

    lastCalled = stamp;
    if (remaining > 0) {
      if (++count >= HOT_COUNT) {
        return arguments[0];
      }
    } else {
      count = 0;
    }
    return func.apply(undefined, arguments);
  };
}

module.exports = shortOut;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_stackClear.js":
/*!******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_stackClear.js ***!
  \******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var ListCache = __webpack_require__(/*! ./_ListCache */ "./node_modules/lseqtree/node_modules/lodash/_ListCache.js");

/**
 * Removes all key-value entries from the stack.
 *
 * @private
 * @name clear
 * @memberOf Stack
 */
function stackClear() {
  this.__data__ = new ListCache;
  this.size = 0;
}

module.exports = stackClear;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_stackDelete.js":
/*!*******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_stackDelete.js ***!
  \*******************************************************************/
/***/ ((module) => {

/**
 * Removes `key` and its value from the stack.
 *
 * @private
 * @name delete
 * @memberOf Stack
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function stackDelete(key) {
  var data = this.__data__,
      result = data['delete'](key);

  this.size = data.size;
  return result;
}

module.exports = stackDelete;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_stackGet.js":
/*!****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_stackGet.js ***!
  \****************************************************************/
/***/ ((module) => {

/**
 * Gets the stack value for `key`.
 *
 * @private
 * @name get
 * @memberOf Stack
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function stackGet(key) {
  return this.__data__.get(key);
}

module.exports = stackGet;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_stackHas.js":
/*!****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_stackHas.js ***!
  \****************************************************************/
/***/ ((module) => {

/**
 * Checks if a stack value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Stack
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function stackHas(key) {
  return this.__data__.has(key);
}

module.exports = stackHas;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_stackSet.js":
/*!****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_stackSet.js ***!
  \****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var ListCache = __webpack_require__(/*! ./_ListCache */ "./node_modules/lseqtree/node_modules/lodash/_ListCache.js"),
    Map = __webpack_require__(/*! ./_Map */ "./node_modules/lseqtree/node_modules/lodash/_Map.js"),
    MapCache = __webpack_require__(/*! ./_MapCache */ "./node_modules/lseqtree/node_modules/lodash/_MapCache.js");

/** Used as the size to enable large array optimizations. */
var LARGE_ARRAY_SIZE = 200;

/**
 * Sets the stack `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Stack
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the stack cache instance.
 */
function stackSet(key, value) {
  var data = this.__data__;
  if (data instanceof ListCache) {
    var pairs = data.__data__;
    if (!Map || (pairs.length < LARGE_ARRAY_SIZE - 1)) {
      pairs.push([key, value]);
      this.size = ++data.size;
      return this;
    }
    data = this.__data__ = new MapCache(pairs);
  }
  data.set(key, value);
  this.size = data.size;
  return this;
}

module.exports = stackSet;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/_toSource.js":
/*!****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/_toSource.js ***!
  \****************************************************************/
/***/ ((module) => {

/** Used for built-in method references. */
var funcProto = Function.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to convert.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

module.exports = toSource;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/constant.js":
/*!***************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/constant.js ***!
  \***************************************************************/
/***/ ((module) => {

/**
 * Creates a function that returns `value`.
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Util
 * @param {*} value The value to return from the new function.
 * @returns {Function} Returns the new constant function.
 * @example
 *
 * var objects = _.times(2, _.constant({ 'a': 1 }));
 *
 * console.log(objects);
 * // => [{ 'a': 1 }, { 'a': 1 }]
 *
 * console.log(objects[0] === objects[1]);
 * // => true
 */
function constant(value) {
  return function() {
    return value;
  };
}

module.exports = constant;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/eq.js":
/*!*********************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/eq.js ***!
  \*********************************************************/
/***/ ((module) => {

/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

module.exports = eq;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/identity.js":
/*!***************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/identity.js ***!
  \***************************************************************/
/***/ ((module) => {

/**
 * This method returns the first argument it receives.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Util
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'a': 1 };
 *
 * console.log(_.identity(object) === object);
 * // => true
 */
function identity(value) {
  return value;
}

module.exports = identity;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/isArguments.js":
/*!******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/isArguments.js ***!
  \******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var baseIsArguments = __webpack_require__(/*! ./_baseIsArguments */ "./node_modules/lseqtree/node_modules/lodash/_baseIsArguments.js"),
    isObjectLike = __webpack_require__(/*! ./isObjectLike */ "./node_modules/lseqtree/node_modules/lodash/isObjectLike.js");

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Built-in value references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
var isArguments = baseIsArguments(function() { return arguments; }()) ? baseIsArguments : function(value) {
  return isObjectLike(value) && hasOwnProperty.call(value, 'callee') &&
    !propertyIsEnumerable.call(value, 'callee');
};

module.exports = isArguments;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/isArray.js":
/*!**************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/isArray.js ***!
  \**************************************************************/
/***/ ((module) => {

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

module.exports = isArray;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/isArrayLike.js":
/*!******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/isArrayLike.js ***!
  \******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isFunction = __webpack_require__(/*! ./isFunction */ "./node_modules/lseqtree/node_modules/lodash/isFunction.js"),
    isLength = __webpack_require__(/*! ./isLength */ "./node_modules/lseqtree/node_modules/lodash/isLength.js");

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}

module.exports = isArrayLike;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/isArrayLikeObject.js":
/*!************************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/isArrayLikeObject.js ***!
  \************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isArrayLike = __webpack_require__(/*! ./isArrayLike */ "./node_modules/lseqtree/node_modules/lodash/isArrayLike.js"),
    isObjectLike = __webpack_require__(/*! ./isObjectLike */ "./node_modules/lseqtree/node_modules/lodash/isObjectLike.js");

/**
 * This method is like `_.isArrayLike` except that it also checks if `value`
 * is an object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array-like object,
 *  else `false`.
 * @example
 *
 * _.isArrayLikeObject([1, 2, 3]);
 * // => true
 *
 * _.isArrayLikeObject(document.body.children);
 * // => true
 *
 * _.isArrayLikeObject('abc');
 * // => false
 *
 * _.isArrayLikeObject(_.noop);
 * // => false
 */
function isArrayLikeObject(value) {
  return isObjectLike(value) && isArrayLike(value);
}

module.exports = isArrayLikeObject;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/isBuffer.js":
/*!***************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/isBuffer.js ***!
  \***************************************************************/
/***/ ((module, exports, __webpack_require__) => {

/* module decorator */ module = __webpack_require__.nmd(module);
var root = __webpack_require__(/*! ./_root */ "./node_modules/lseqtree/node_modules/lodash/_root.js"),
    stubFalse = __webpack_require__(/*! ./stubFalse */ "./node_modules/lseqtree/node_modules/lodash/stubFalse.js");

/** Detect free variable `exports`. */
var freeExports =  true && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && "object" == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Built-in value references. */
var Buffer = moduleExports ? root.Buffer : undefined;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

/**
 * Checks if `value` is a buffer.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
 * @example
 *
 * _.isBuffer(new Buffer(2));
 * // => true
 *
 * _.isBuffer(new Uint8Array(2));
 * // => false
 */
var isBuffer = nativeIsBuffer || stubFalse;

module.exports = isBuffer;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/isFunction.js":
/*!*****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/isFunction.js ***!
  \*****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var baseGetTag = __webpack_require__(/*! ./_baseGetTag */ "./node_modules/lseqtree/node_modules/lodash/_baseGetTag.js"),
    isObject = __webpack_require__(/*! ./isObject */ "./node_modules/lseqtree/node_modules/lodash/isObject.js");

/** `Object#toString` result references. */
var asyncTag = '[object AsyncFunction]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    proxyTag = '[object Proxy]';

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  if (!isObject(value)) {
    return false;
  }
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 9 which returns 'object' for typed arrays and other constructors.
  var tag = baseGetTag(value);
  return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
}

module.exports = isFunction;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/isLength.js":
/*!***************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/isLength.js ***!
  \***************************************************************/
/***/ ((module) => {

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

module.exports = isLength;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/isObject.js":
/*!***************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/isObject.js ***!
  \***************************************************************/
/***/ ((module) => {

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

module.exports = isObject;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/isObjectLike.js":
/*!*******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/isObjectLike.js ***!
  \*******************************************************************/
/***/ ((module) => {

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

module.exports = isObjectLike;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/isPlainObject.js":
/*!********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/isPlainObject.js ***!
  \********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var baseGetTag = __webpack_require__(/*! ./_baseGetTag */ "./node_modules/lseqtree/node_modules/lodash/_baseGetTag.js"),
    getPrototype = __webpack_require__(/*! ./_getPrototype */ "./node_modules/lseqtree/node_modules/lodash/_getPrototype.js"),
    isObjectLike = __webpack_require__(/*! ./isObjectLike */ "./node_modules/lseqtree/node_modules/lodash/isObjectLike.js");

/** `Object#toString` result references. */
var objectTag = '[object Object]';

/** Used for built-in method references. */
var funcProto = Function.prototype,
    objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to infer the `Object` constructor. */
var objectCtorString = funcToString.call(Object);

/**
 * Checks if `value` is a plain object, that is, an object created by the
 * `Object` constructor or one with a `[[Prototype]]` of `null`.
 *
 * @static
 * @memberOf _
 * @since 0.8.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 * }
 *
 * _.isPlainObject(new Foo);
 * // => false
 *
 * _.isPlainObject([1, 2, 3]);
 * // => false
 *
 * _.isPlainObject({ 'x': 0, 'y': 0 });
 * // => true
 *
 * _.isPlainObject(Object.create(null));
 * // => true
 */
function isPlainObject(value) {
  if (!isObjectLike(value) || baseGetTag(value) != objectTag) {
    return false;
  }
  var proto = getPrototype(value);
  if (proto === null) {
    return true;
  }
  var Ctor = hasOwnProperty.call(proto, 'constructor') && proto.constructor;
  return typeof Ctor == 'function' && Ctor instanceof Ctor &&
    funcToString.call(Ctor) == objectCtorString;
}

module.exports = isPlainObject;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/isTypedArray.js":
/*!*******************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/isTypedArray.js ***!
  \*******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var baseIsTypedArray = __webpack_require__(/*! ./_baseIsTypedArray */ "./node_modules/lseqtree/node_modules/lodash/_baseIsTypedArray.js"),
    baseUnary = __webpack_require__(/*! ./_baseUnary */ "./node_modules/lseqtree/node_modules/lodash/_baseUnary.js"),
    nodeUtil = __webpack_require__(/*! ./_nodeUtil */ "./node_modules/lseqtree/node_modules/lodash/_nodeUtil.js");

/* Node.js helper references. */
var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;

module.exports = isTypedArray;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/keysIn.js":
/*!*************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/keysIn.js ***!
  \*************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var arrayLikeKeys = __webpack_require__(/*! ./_arrayLikeKeys */ "./node_modules/lseqtree/node_modules/lodash/_arrayLikeKeys.js"),
    baseKeysIn = __webpack_require__(/*! ./_baseKeysIn */ "./node_modules/lseqtree/node_modules/lodash/_baseKeysIn.js"),
    isArrayLike = __webpack_require__(/*! ./isArrayLike */ "./node_modules/lseqtree/node_modules/lodash/isArrayLike.js");

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  return isArrayLike(object) ? arrayLikeKeys(object, true) : baseKeysIn(object);
}

module.exports = keysIn;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/merge.js":
/*!************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/merge.js ***!
  \************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var baseMerge = __webpack_require__(/*! ./_baseMerge */ "./node_modules/lseqtree/node_modules/lodash/_baseMerge.js"),
    createAssigner = __webpack_require__(/*! ./_createAssigner */ "./node_modules/lseqtree/node_modules/lodash/_createAssigner.js");

/**
 * This method is like `_.assign` except that it recursively merges own and
 * inherited enumerable string keyed properties of source objects into the
 * destination object. Source properties that resolve to `undefined` are
 * skipped if a destination value exists. Array and plain object properties
 * are merged recursively. Other objects and value types are overridden by
 * assignment. Source objects are applied from left to right. Subsequent
 * sources overwrite property assignments of previous sources.
 *
 * **Note:** This method mutates `object`.
 *
 * @static
 * @memberOf _
 * @since 0.5.0
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @returns {Object} Returns `object`.
 * @example
 *
 * var object = {
 *   'a': [{ 'b': 2 }, { 'd': 4 }]
 * };
 *
 * var other = {
 *   'a': [{ 'c': 3 }, { 'e': 5 }]
 * };
 *
 * _.merge(object, other);
 * // => { 'a': [{ 'b': 2, 'c': 3 }, { 'd': 4, 'e': 5 }] }
 */
var merge = createAssigner(function(object, source, srcIndex) {
  baseMerge(object, source, srcIndex);
});

module.exports = merge;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/stubFalse.js":
/*!****************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/stubFalse.js ***!
  \****************************************************************/
/***/ ((module) => {

/**
 * This method returns `false`.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {boolean} Returns `false`.
 * @example
 *
 * _.times(2, _.stubFalse);
 * // => [false, false]
 */
function stubFalse() {
  return false;
}

module.exports = stubFalse;


/***/ }),

/***/ "./node_modules/lseqtree/node_modules/lodash/toPlainObject.js":
/*!********************************************************************!*\
  !*** ./node_modules/lseqtree/node_modules/lodash/toPlainObject.js ***!
  \********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var copyObject = __webpack_require__(/*! ./_copyObject */ "./node_modules/lseqtree/node_modules/lodash/_copyObject.js"),
    keysIn = __webpack_require__(/*! ./keysIn */ "./node_modules/lseqtree/node_modules/lodash/keysIn.js");

/**
 * Converts `value` to a plain object flattening inherited enumerable string
 * keyed properties of `value` to own properties of the plain object.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {Object} Returns the converted plain object.
 * @example
 *
 * function Foo() {
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.assign({ 'a': 1 }, new Foo);
 * // => { 'a': 1, 'b': 2 }
 *
 * _.assign({ 'a': 1 }, _.toPlainObject(new Foo));
 * // => { 'a': 1, 'b': 2, 'c': 3 }
 */
function toPlainObject(value) {
  return copyObject(value, keysIn(value));
}

module.exports = toPlainObject;


/***/ }),

/***/ "./src/client/RTC-MultiConnection.js":
/*!*******************************************!*\
  !*** ./src/client/RTC-MultiConnection.js ***!
  \*******************************************/
/***/ ((module, exports, __webpack_require__) => {

"use strict";
var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;

// Last time updated: 2020-08-26 8:55:13 AM UTC

// _________________________
// RTCMultiConnection v3.7.0

// Open-Sourced: https://github.com/muaz-khan/RTCMultiConnection

// --------------------------------------------------
// Muaz Khan     - www.MuazKhan.com
// MIT License   - www.WebRTC-Experiment.com/licence
// --------------------------------------------------

var RTCMultiConnection = function (roomid, forceOptions) {

    var browserFakeUserAgent = 'Fake/5.0 (FakeOS) AppleWebKit/123 (KHTML, like Gecko) Fake/12.3.4567.89 Fake/123.45';

    (function(that) {
        if (!that) {
            return;
        }

        if (typeof window !== 'undefined') {
            return;
        }

        if (typeof __webpack_require__.g === 'undefined') {
            return;
        }

        __webpack_require__.g.navigator = {
            userAgent: browserFakeUserAgent,
            getUserMedia: function() {}
        };

        if (!__webpack_require__.g.console) {
            __webpack_require__.g.console = {};
        }

        if (typeof __webpack_require__.g.console.debug === 'undefined') {
            __webpack_require__.g.console.debug = __webpack_require__.g.console.info = __webpack_require__.g.console.error = __webpack_require__.g.console.log = __webpack_require__.g.console.log || function() {
                console.log(arguments);
            };
        }

        if (typeof document === 'undefined') {
            /*global document:true */
            that.document = {};

            document.createElement = document.captureStream = document.mozCaptureStream = function() {
                var obj = {
                    getContext: function() {
                        return obj;
                    },
                    play: function() {},
                    pause: function() {},
                    drawImage: function() {},
                    toDataURL: function() {
                        return '';
                    }
                };
                return obj;
            };

            document.addEventListener = document.removeEventListener = that.addEventListener = that.removeEventListener = function() {};

            that.HTMLVideoElement = that.HTMLMediaElement = function() {};
        }

        if (typeof io === 'undefined') {
            that.io = function() {
                return {
                    on: function(eventName, callback) {
                        callback = callback || function() {};

                        if (eventName === 'connect') {
                            callback();
                        }
                    },
                    emit: function(eventName, data, callback) {
                        callback = callback || function() {};
                        if (eventName === 'open-room' || eventName === 'join-room') {
                            callback(true, data.sessionid, null);
                        }
                    }
                };
            };
        }

        if (typeof location === 'undefined') {
            /*global location:true */
            that.location = {
                protocol: 'file:',
                href: '',
                hash: '',
                origin: 'self'
            };
        }

        if (typeof screen === 'undefined') {
            /*global screen:true */
            that.screen = {
                width: 0,
                height: 0
            };
        }

        if (typeof URL === 'undefined') {
            /*global screen:true */
            that.URL = {
                createObjectURL: function() {
                    return '';
                },
                revokeObjectURL: function() {
                    return '';
                }
            };
        }

        /*global window:true */
        that.window = __webpack_require__.g;
    })(typeof __webpack_require__.g !== 'undefined' ? __webpack_require__.g : null);

    function SocketConnection(connection, connectCallback) {
        function isData(session) {
            return !session.audio && !session.video && !session.screen && session.data;
        }

        var parameters = '';

        parameters += '?userid=' + connection.userid;
        parameters += '&sessionid=' + connection.sessionid;
        parameters += '&msgEvent=' + connection.socketMessageEvent;
        parameters += '&socketCustomEvent=' + connection.socketCustomEvent;
        parameters += '&autoCloseEntireSession=' + !!connection.autoCloseEntireSession;

        if (connection.session.broadcast === true) {
            parameters += '&oneToMany=true';
        }

        parameters += '&maxParticipantsAllowed=' + connection.maxParticipantsAllowed;

        if (connection.enableScalableBroadcast) {
            parameters += '&enableScalableBroadcast=true';
            parameters += '&maxRelayLimitPerUser=' + (connection.maxRelayLimitPerUser || 2);
        }

        parameters += '&extra=' + JSON.stringify(connection.extra || {});

        if (connection.socketCustomParameters) {
            parameters += connection.socketCustomParameters;
        }

        try {
            io.sockets = {};
        } catch (e) {};

        if (!connection.socketURL) {
            connection.socketURL = '/';
        }

        if (connection.socketURL.substr(connection.socketURL.length - 1, 1) != '/') {
            // connection.socketURL = 'https://domain.com:9001/';
            throw '"socketURL" MUST end with a slash.';
        }

        if (connection.enableLogs) {
            if (connection.socketURL == '/') {
                console.info('socket.io url is: ', location.origin + '/');
            } else {
                console.info('socket.io url is: ', connection.socketURL);
            }
        }

        try {
            connection.socket = io(connection.socketURL + parameters);
        } catch (e) {
            connection.socket = io.connect(connection.socketURL + parameters, connection.socketOptions);
        }

        var mPeer = connection.multiPeersHandler;

        connection.socket.on('extra-data-updated', function(remoteUserId, extra) {
            if (!connection.peers[remoteUserId]) return;
            connection.peers[remoteUserId].extra = extra;

            connection.onExtraDataUpdated({
                userid: remoteUserId,
                extra: extra
            });

            updateExtraBackup(remoteUserId, extra);
        });

        function updateExtraBackup(remoteUserId, extra) {
            if (!connection.peersBackup[remoteUserId]) {
                connection.peersBackup[remoteUserId] = {
                    userid: remoteUserId,
                    extra: {}
                };
            }

            connection.peersBackup[remoteUserId].extra = extra;
        }

        function onMessageEvent(message) {
            if (message.remoteUserId != connection.userid) return;

            if (connection.peers[message.sender] && connection.peers[message.sender].extra != message.message.extra) {
                connection.peers[message.sender].extra = message.extra;
                connection.onExtraDataUpdated({
                    userid: message.sender,
                    extra: message.extra
                });

                updateExtraBackup(message.sender, message.extra);
            }

            if (message.message.streamSyncNeeded && connection.peers[message.sender]) {
                var stream = connection.streamEvents[message.message.streamid];
                if (!stream || !stream.stream) {
                    return;
                }

                var action = message.message.action;

                if (action === 'ended' || action === 'inactive' || action === 'stream-removed') {
                    if (connection.peersBackup[stream.userid]) {
                        stream.extra = connection.peersBackup[stream.userid].extra;
                    }
                    connection.onstreamended(stream);
                    return;
                }

                var type = message.message.type != 'both' ? message.message.type : null;

                if (typeof stream.stream[action] == 'function') {
                    stream.stream[action](type);
                }
                return;
            }

            if (message.message === 'dropPeerConnection') {
                connection.deletePeer(message.sender);
                return;
            }

            if (message.message.allParticipants) {
                if (message.message.allParticipants.indexOf(message.sender) === -1) {
                    message.message.allParticipants.push(message.sender);
                }

                message.message.allParticipants.forEach(function(participant) {
                    mPeer[!connection.peers[participant] ? 'createNewPeer' : 'renegotiatePeer'](participant, {
                        localPeerSdpConstraints: {
                            OfferToReceiveAudio: connection.sdpConstraints.mandatory.OfferToReceiveAudio,
                            OfferToReceiveVideo: connection.sdpConstraints.mandatory.OfferToReceiveVideo
                        },
                        remotePeerSdpConstraints: {
                            OfferToReceiveAudio: connection.session.oneway ? !!connection.session.audio : connection.sdpConstraints.mandatory.OfferToReceiveAudio,
                            OfferToReceiveVideo: connection.session.oneway ? !!connection.session.video || !!connection.session.screen : connection.sdpConstraints.mandatory.OfferToReceiveVideo
                        },
                        isOneWay: !!connection.session.oneway || connection.direction === 'one-way',
                        isDataOnly: isData(connection.session)
                    });
                });
                return;
            }

            if (message.message.newParticipant) {
                if (message.message.newParticipant == connection.userid) return;
                if (!!connection.peers[message.message.newParticipant]) return;

                mPeer.createNewPeer(message.message.newParticipant, message.message.userPreferences || {
                    localPeerSdpConstraints: {
                        OfferToReceiveAudio: connection.sdpConstraints.mandatory.OfferToReceiveAudio,
                        OfferToReceiveVideo: connection.sdpConstraints.mandatory.OfferToReceiveVideo
                    },
                    remotePeerSdpConstraints: {
                        OfferToReceiveAudio: connection.session.oneway ? !!connection.session.audio : connection.sdpConstraints.mandatory.OfferToReceiveAudio,
                        OfferToReceiveVideo: connection.session.oneway ? !!connection.session.video || !!connection.session.screen : connection.sdpConstraints.mandatory.OfferToReceiveVideo
                    },
                    isOneWay: !!connection.session.oneway || connection.direction === 'one-way',
                    isDataOnly: isData(connection.session)
                });
                return;
            }

            if (message.message.readyForOffer) {
                if (connection.attachStreams.length) {
                    connection.waitingForLocalMedia = false;
                }

                if (connection.waitingForLocalMedia) {
                    // if someone is waiting to join you
                    // make sure that we've local media before making a handshake
                    setTimeout(function() {
                        onMessageEvent(message);
                    }, 1);
                    return;
                }
            }

            if (message.message.newParticipationRequest && message.sender !== connection.userid) {
                if (connection.peers[message.sender]) {
                    connection.deletePeer(message.sender);
                }

                var userPreferences = {
                    extra: message.extra || {},
                    localPeerSdpConstraints: message.message.remotePeerSdpConstraints || {
                        OfferToReceiveAudio: connection.sdpConstraints.mandatory.OfferToReceiveAudio,
                        OfferToReceiveVideo: connection.sdpConstraints.mandatory.OfferToReceiveVideo
                    },
                    remotePeerSdpConstraints: message.message.localPeerSdpConstraints || {
                        OfferToReceiveAudio: connection.session.oneway ? !!connection.session.audio : connection.sdpConstraints.mandatory.OfferToReceiveAudio,
                        OfferToReceiveVideo: connection.session.oneway ? !!connection.session.video || !!connection.session.screen : connection.sdpConstraints.mandatory.OfferToReceiveVideo
                    },
                    isOneWay: typeof message.message.isOneWay !== 'undefined' ? message.message.isOneWay : !!connection.session.oneway || connection.direction === 'one-way',
                    isDataOnly: typeof message.message.isDataOnly !== 'undefined' ? message.message.isDataOnly : isData(connection.session),
                    dontGetRemoteStream: typeof message.message.isOneWay !== 'undefined' ? message.message.isOneWay : !!connection.session.oneway || connection.direction === 'one-way',
                    dontAttachLocalStream: !!message.message.dontGetRemoteStream,
                    connectionDescription: message,
                    successCallback: function() {}
                };

                connection.onNewParticipant(message.sender, userPreferences);
                return;
            }

            if (message.message.changedUUID) {
                if (connection.peers[message.message.oldUUID]) {
                    connection.peers[message.message.newUUID] = connection.peers[message.message.oldUUID];
                    delete connection.peers[message.message.oldUUID];
                }
            }

            if (message.message.userLeft) {
                mPeer.onUserLeft(message.sender);

                if (!!message.message.autoCloseEntireSession) {
                    connection.leave();
                }

                return;
            }

            mPeer.addNegotiatedMessage(message.message, message.sender);
        }

        connection.socket.on(connection.socketMessageEvent, onMessageEvent);

        var alreadyConnected = false;

        connection.socket.resetProps = function() {
            alreadyConnected = false;
        };

        connection.socket.on('connect', function() {
            if (alreadyConnected) {
                return;
            }
            alreadyConnected = true;

            if (connection.enableLogs) {
                console.info('socket.io connection is opened.');
            }

            setTimeout(function() {
                connection.socket.emit('extra-data-updated', connection.extra);
            }, 1000);

            if (connectCallback) {
                connectCallback(connection.socket);
            }
        });

        connection.socket.on('disconnect', function(event) {
            connection.onSocketDisconnect(event);
        });

        connection.socket.on('error', function(event) {
            connection.onSocketError(event);
        });

        connection.socket.on('user-disconnected', function(remoteUserId) {
            if (remoteUserId === connection.userid) {
                return;
            }

            connection.onUserStatusChanged({
                userid: remoteUserId,
                status: 'offline',
                extra: connection.peers[remoteUserId] ? connection.peers[remoteUserId].extra || {} : {}
            });

            connection.deletePeer(remoteUserId);
        });

        connection.socket.on('user-connected', function(userid) {
            if (userid === connection.userid) {
                return;
            }

            connection.onUserStatusChanged({
                userid: userid,
                status: 'online',
                extra: connection.peers[userid] ? connection.peers[userid].extra || {} : {}
            });
        });

        connection.socket.on('closed-entire-session', function(sessionid, extra) {
            connection.leave();
            connection.onEntireSessionClosed({
                sessionid: sessionid,
                userid: sessionid,
                extra: extra
            });
        });

        connection.socket.on('userid-already-taken', function(useridAlreadyTaken, yourNewUserId) {
            connection.onUserIdAlreadyTaken(useridAlreadyTaken, yourNewUserId);
        });

        connection.socket.on('logs', function(log) {
            if (!connection.enableLogs) return;
            console.debug('server-logs', log);
        });

        connection.socket.on('number-of-broadcast-viewers-updated', function(data) {
            connection.onNumberOfBroadcastViewersUpdated(data);
        });

        connection.socket.on('set-isInitiator-true', function(sessionid) {
            if (sessionid != connection.sessionid) return;
            connection.isInitiator = true;
        });
    }

    function MultiPeers(connection) {
        var self = this;

        var skipPeers = ['getAllParticipants', 'getLength', 'selectFirst', 'streams', 'send', 'forEach'];
        connection.peers = {
            getLength: function() {
                var numberOfPeers = 0;
                for (var peer in this) {
                    if (skipPeers.indexOf(peer) == -1) {
                        numberOfPeers++;
                    }
                }
                return numberOfPeers;
            },
            selectFirst: function() {
                var firstPeer;
                for (var peer in this) {
                    if (skipPeers.indexOf(peer) == -1) {
                        firstPeer = this[peer];
                    }
                }
                return firstPeer;
            },
            getAllParticipants: function(sender) {
                var allPeers = [];
                for (var peer in this) {
                    if (skipPeers.indexOf(peer) == -1 && peer != sender) {
                        allPeers.push(peer);
                    }
                }
                return allPeers;
            },
            forEach: function(callback) {
                this.getAllParticipants().forEach(function(participant) {
                    callback(connection.peers[participant]);
                });
            },
            send: function(data, remoteUserId) {
                var that = this;

                if (!isNull(data.size) && !isNull(data.type)) {
                    if (connection.enableFileSharing) {
                        self.shareFile(data, remoteUserId);
                        return;
                    }

                    if (typeof data !== 'string') {
                        data = JSON.stringify(data);
                    }
                }

                if (data.type !== 'text' && !(data instanceof ArrayBuffer) && !(data instanceof DataView)) {
                    TextSender.send({
                        text: data,
                        channel: this,
                        connection: connection,
                        remoteUserId: remoteUserId
                    });
                    return;
                }

                if (data.type === 'text') {
                    data = JSON.stringify(data);
                }

                if (remoteUserId) {
                    var remoteUser = connection.peers[remoteUserId];
                    if (remoteUser) {
                        if (!remoteUser.channels.length) {
                            connection.peers[remoteUserId].createDataChannel();
                            connection.renegotiate(remoteUserId);
                            setTimeout(function() {
                                that.send(data, remoteUserId);
                            }, 3000);
                            return;
                        }

                        remoteUser.channels.forEach(function(channel) {
                            channel.send(data);
                        });
                        return;
                    }
                }

                this.getAllParticipants().forEach(function(participant) {
                    if (!that[participant].channels.length) {
                        connection.peers[participant].createDataChannel();
                        connection.renegotiate(participant);
                        setTimeout(function() {
                            that[participant].channels.forEach(function(channel) {
                                channel.send(data);
                            });
                        }, 3000);
                        return;
                    }

                    that[participant].channels.forEach(function(channel) {
                        channel.send(data);
                    });
                });
            }
        };

        this.uuid = connection.userid;

        this.getLocalConfig = function(remoteSdp, remoteUserId, userPreferences) {
            if (!userPreferences) {
                userPreferences = {};
            }

            return {
                streamsToShare: userPreferences.streamsToShare || {},
                rtcMultiConnection: connection,
                connectionDescription: userPreferences.connectionDescription,
                userid: remoteUserId,
                localPeerSdpConstraints: userPreferences.localPeerSdpConstraints,
                remotePeerSdpConstraints: userPreferences.remotePeerSdpConstraints,
                dontGetRemoteStream: !!userPreferences.dontGetRemoteStream,
                dontAttachLocalStream: !!userPreferences.dontAttachLocalStream,
                renegotiatingPeer: !!userPreferences.renegotiatingPeer,
                peerRef: userPreferences.peerRef,
                channels: userPreferences.channels || [],
                onLocalSdp: function(localSdp) {
                    self.onNegotiationNeeded(localSdp, remoteUserId);
                },
                onLocalCandidate: function(localCandidate) {
                    localCandidate = OnIceCandidateHandler.processCandidates(connection, localCandidate)
                    if (localCandidate) {
                        self.onNegotiationNeeded(localCandidate, remoteUserId);
                    }
                },
                remoteSdp: remoteSdp,
                onDataChannelMessage: function(message) {
                    if (!connection.fbr && connection.enableFileSharing) initFileBufferReader();

                    if (typeof message == 'string' || !connection.enableFileSharing) {
                        self.onDataChannelMessage(message, remoteUserId);
                        return;
                    }

                    var that = this;

                    if (message instanceof ArrayBuffer || message instanceof DataView) {
                        connection.fbr.convertToObject(message, function(object) {
                            that.onDataChannelMessage(object);
                        });
                        return;
                    }

                    if (message.readyForNextChunk) {
                        connection.fbr.getNextChunk(message, function(nextChunk, isLastChunk) {
                            connection.peers[remoteUserId].channels.forEach(function(channel) {
                                channel.send(nextChunk);
                            });
                        }, remoteUserId);
                        return;
                    }

                    if (message.chunkMissing) {
                        connection.fbr.chunkMissing(message);
                        return;
                    }

                    connection.fbr.addChunk(message, function(promptNextChunk) {
                        connection.peers[remoteUserId].peer.channel.send(promptNextChunk);
                    });
                },
                onDataChannelError: function(error) {
                    self.onDataChannelError(error, remoteUserId);
                },
                onDataChannelOpened: function(channel) {
                    self.onDataChannelOpened(channel, remoteUserId);
                },
                onDataChannelClosed: function(event) {
                    self.onDataChannelClosed(event, remoteUserId);
                },
                onRemoteStream: function(stream) {
                    if (connection.peers[remoteUserId]) {
                        connection.peers[remoteUserId].streams.push(stream);
                    }

                    self.onGettingRemoteMedia(stream, remoteUserId);
                },
                onRemoteStreamRemoved: function(stream) {
                    self.onRemovingRemoteMedia(stream, remoteUserId);
                },
                onPeerStateChanged: function(states) {
                    self.onPeerStateChanged(states);

                    if (states.iceConnectionState === 'new') {
                        self.onNegotiationStarted(remoteUserId, states);
                    }

                    if (states.iceConnectionState === 'connected') {
                        self.onNegotiationCompleted(remoteUserId, states);
                    }

                    if (states.iceConnectionState.search(/closed|failed/gi) !== -1) {
                        self.onUserLeft(remoteUserId);
                        self.disconnectWith(remoteUserId);
                    }
                }
            };
        };

        this.createNewPeer = function(remoteUserId, userPreferences) {
            if (connection.maxParticipantsAllowed <= connection.getAllParticipants().length) {
                return;
            }

            userPreferences = userPreferences || {};

            if (connection.isInitiator && !!connection.session.audio && connection.session.audio === 'two-way' && !userPreferences.streamsToShare) {
                userPreferences.isOneWay = false;
                userPreferences.isDataOnly = false;
                userPreferences.session = connection.session;
            }

            if (!userPreferences.isOneWay && !userPreferences.isDataOnly) {
                userPreferences.isOneWay = true;
                this.onNegotiationNeeded({
                    enableMedia: true,
                    userPreferences: userPreferences
                }, remoteUserId);
                return;
            }

            userPreferences = connection.setUserPreferences(userPreferences, remoteUserId);
            var localConfig = this.getLocalConfig(null, remoteUserId, userPreferences);
            connection.peers[remoteUserId] = new PeerInitiator(localConfig);
        };

        this.createAnsweringPeer = function(remoteSdp, remoteUserId, userPreferences) {
            userPreferences = connection.setUserPreferences(userPreferences || {}, remoteUserId);

            var localConfig = this.getLocalConfig(remoteSdp, remoteUserId, userPreferences);
            connection.peers[remoteUserId] = new PeerInitiator(localConfig);
        };

        this.renegotiatePeer = function(remoteUserId, userPreferences, remoteSdp) {
            if (!connection.peers[remoteUserId]) {
                if (connection.enableLogs) {
                    console.error('Peer (' + remoteUserId + ') does not exist. Renegotiation skipped.');
                }
                return;
            }

            if (!userPreferences) {
                userPreferences = {};
            }

            userPreferences.renegotiatingPeer = true;
            userPreferences.peerRef = connection.peers[remoteUserId].peer;
            userPreferences.channels = connection.peers[remoteUserId].channels;

            var localConfig = this.getLocalConfig(remoteSdp, remoteUserId, userPreferences);

            connection.peers[remoteUserId] = new PeerInitiator(localConfig);
        };

        this.replaceTrack = function(track, remoteUserId, isVideoTrack) {
            if (!connection.peers[remoteUserId]) {
                throw 'This peer (' + remoteUserId + ') does not exist.';
            }

            var peer = connection.peers[remoteUserId].peer;

            if (!!peer.getSenders && typeof peer.getSenders === 'function' && peer.getSenders().length) {
                peer.getSenders().forEach(function(rtpSender) {
                    if (isVideoTrack && rtpSender.track.kind === 'video') {
                        connection.peers[remoteUserId].peer.lastVideoTrack = rtpSender.track;
                        rtpSender.replaceTrack(track);
                    }

                    if (!isVideoTrack && rtpSender.track.kind === 'audio') {
                        connection.peers[remoteUserId].peer.lastAudioTrack = rtpSender.track;
                        rtpSender.replaceTrack(track);
                    }
                });
                return;
            }

            console.warn('RTPSender.replaceTrack is NOT supported.');
            this.renegotiatePeer(remoteUserId);
        };

        this.onNegotiationNeeded = function(message, remoteUserId) {};
        this.addNegotiatedMessage = function(message, remoteUserId) {
            if (message.type && message.sdp) {
                if (message.type == 'answer') {
                    if (connection.peers[remoteUserId]) {
                        connection.peers[remoteUserId].addRemoteSdp(message);
                    }
                }

                if (message.type == 'offer') {
                    if (message.renegotiatingPeer) {
                        this.renegotiatePeer(remoteUserId, null, message);
                    } else {
                        this.createAnsweringPeer(message, remoteUserId);
                    }
                }

                if (connection.enableLogs) {
                    console.log('Remote peer\'s sdp:', message.sdp);
                }
                return;
            }

            if (message.candidate) {
                if (connection.peers[remoteUserId]) {
                    connection.peers[remoteUserId].addRemoteCandidate(message);
                }

                if (connection.enableLogs) {
                    console.log('Remote peer\'s candidate pairs:', message.candidate);
                }
                return;
            }

            if (message.enableMedia) {
                connection.session = message.userPreferences.session || connection.session;

                if (connection.session.oneway && connection.attachStreams.length) {
                    connection.attachStreams = [];
                }

                if (message.userPreferences.isDataOnly && connection.attachStreams.length) {
                    connection.attachStreams.length = [];
                }

                var streamsToShare = {};
                connection.attachStreams.forEach(function(stream) {
                    streamsToShare[stream.streamid] = {
                        isAudio: !!stream.isAudio,
                        isVideo: !!stream.isVideo,
                        isScreen: !!stream.isScreen
                    };
                });
                message.userPreferences.streamsToShare = streamsToShare;

                self.onNegotiationNeeded({
                    readyForOffer: true,
                    userPreferences: message.userPreferences
                }, remoteUserId);
            }

            if (message.readyForOffer) {
                connection.onReadyForOffer(remoteUserId, message.userPreferences);
            }

            function cb(stream) {
                gumCallback(stream, message, remoteUserId);
            }
        };

        function gumCallback(stream, message, remoteUserId) {
            var streamsToShare = {};
            connection.attachStreams.forEach(function(stream) {
                streamsToShare[stream.streamid] = {
                    isAudio: !!stream.isAudio,
                    isVideo: !!stream.isVideo,
                    isScreen: !!stream.isScreen
                };
            });
            message.userPreferences.streamsToShare = streamsToShare;

            self.onNegotiationNeeded({
                readyForOffer: true,
                userPreferences: message.userPreferences
            }, remoteUserId);
        }

        this.onGettingRemoteMedia = function(stream, remoteUserId) {};
        this.onRemovingRemoteMedia = function(stream, remoteUserId) {};
        this.onGettingLocalMedia = function(localStream) {};
        this.onLocalMediaError = function(error, constraints) {
            connection.onMediaError(error, constraints);
        };

        function initFileBufferReader() {
            connection.fbr = new FileBufferReader();
            connection.fbr.onProgress = function(chunk) {
                connection.onFileProgress(chunk);
            };
            connection.fbr.onBegin = function(file) {
                connection.onFileStart(file);
            };
            connection.fbr.onEnd = function(file) {
                connection.onFileEnd(file);
            };
        }

        this.shareFile = function(file, remoteUserId) {
            initFileBufferReader();

            connection.fbr.readAsArrayBuffer(file, function(uuid) {
                var arrayOfUsers = connection.getAllParticipants();

                if (remoteUserId) {
                    arrayOfUsers = [remoteUserId];
                }

                arrayOfUsers.forEach(function(participant) {
                    connection.fbr.getNextChunk(uuid, function(nextChunk) {
                        connection.peers[participant].channels.forEach(function(channel) {
                            channel.send(nextChunk);
                        });
                    }, participant);
                });
            }, {
                userid: connection.userid,
                // extra: connection.extra,
                chunkSize: DetectRTC.browser.name === 'Firefox' ? 15 * 1000 : connection.chunkSize || 0
            });
        };

        if (true) {
            var textReceiver = new TextReceiver(connection);
        }

        this.onDataChannelMessage = function(message, remoteUserId) {
            textReceiver.receive(JSON.parse(message), remoteUserId, connection.peers[remoteUserId] ? connection.peers[remoteUserId].extra : {});
        };

        this.onDataChannelClosed = function(event, remoteUserId) {
            event.userid = remoteUserId;
            event.extra = connection.peers[remoteUserId] ? connection.peers[remoteUserId].extra : {};
            connection.onclose(event);
        };

        this.onDataChannelError = function(error, remoteUserId) {
            error.userid = remoteUserId;
            event.extra = connection.peers[remoteUserId] ? connection.peers[remoteUserId].extra : {};
            connection.onerror(error);
        };

        this.onDataChannelOpened = function(channel, remoteUserId) {
            // keep last channel only; we are not expecting parallel/channels channels
            if (connection.peers[remoteUserId].channels.length) {
                connection.peers[remoteUserId].channels = [channel];
                return;
            }

            connection.peers[remoteUserId].channels.push(channel);
            connection.onopen({
                userid: remoteUserId,
                extra: connection.peers[remoteUserId] ? connection.peers[remoteUserId].extra : {},
                channel: channel
            });
        };

        this.onPeerStateChanged = function(state) {
            connection.onPeerStateChanged(state);
        };

        this.onNegotiationStarted = function(remoteUserId, states) {};
        this.onNegotiationCompleted = function(remoteUserId, states) {};

        this.getRemoteStreams = function(remoteUserId) {
            remoteUserId = remoteUserId || connection.peers.getAllParticipants()[0];
            return connection.peers[remoteUserId] ? connection.peers[remoteUserId].streams : [];
        };
    }

    'use strict';

    // Last Updated On: 2019-01-10 5:32:55 AM UTC

    // ________________
    // DetectRTC v1.3.9

    // Open-Sourced: https://github.com/muaz-khan/DetectRTC

    // --------------------------------------------------
    // Muaz Khan     - www.MuazKhan.com
    // MIT License   - www.WebRTC-Experiment.com/licence
    // --------------------------------------------------

    (function() {

        var browserFakeUserAgent = 'Fake/5.0 (FakeOS) AppleWebKit/123 (KHTML, like Gecko) Fake/12.3.4567.89 Fake/123.45';

        var isNodejs = typeof process === 'object' && typeof process.versions === 'object' && process.versions.node && /*node-process*/ !process.browser;
        if (isNodejs) {
            var version = process.versions.node.toString().replace('v', '');
            browserFakeUserAgent = 'Nodejs/' + version + ' (NodeOS) AppleWebKit/' + version + ' (KHTML, like Gecko) Nodejs/' + version + ' Nodejs/' + version
        }

        (function(that) {
            if (typeof window !== 'undefined') {
                return;
            }

            if (typeof window === 'undefined' && typeof __webpack_require__.g !== 'undefined') {
                __webpack_require__.g.navigator = {
                    userAgent: browserFakeUserAgent,
                    getUserMedia: function() {}
                };

                /*global window:true */
                that.window = __webpack_require__.g;
            } else if (typeof window === 'undefined') {
                // window = this;
            }

            if (typeof location === 'undefined') {
                /*global location:true */
                that.location = {
                    protocol: 'file:',
                    href: '',
                    hash: ''
                };
            }

            if (typeof screen === 'undefined') {
                /*global screen:true */
                that.screen = {
                    width: 0,
                    height: 0
                };
            }
        })(typeof __webpack_require__.g !== 'undefined' ? __webpack_require__.g : window);

        /*global navigator:true */
        var navigator = window.navigator;

        if (typeof navigator !== 'undefined') {
            if (typeof navigator.webkitGetUserMedia !== 'undefined') {
                navigator.getUserMedia = navigator.webkitGetUserMedia;
            }

            if (typeof navigator.mozGetUserMedia !== 'undefined') {
                navigator.getUserMedia = navigator.mozGetUserMedia;
            }
        } else {
            navigator = {
                getUserMedia: function() {},
                userAgent: browserFakeUserAgent
            };
        }

        var isMobileDevice = !!(/Android|webOS|iPhone|iPad|iPod|BB10|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(navigator.userAgent || ''));

        var isEdge = navigator.userAgent.indexOf('Edge') !== -1 && (!!navigator.msSaveOrOpenBlob || !!navigator.msSaveBlob);

        var isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
        var isFirefox = typeof window.InstallTrigger !== 'undefined';
        var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        var isChrome = !!window.chrome && !isOpera;
        var isIE = typeof document !== 'undefined' && !!document.documentMode && !isEdge;

        // this one can also be used:
        // https://www.websocket.org/js/stuff.js (DetectBrowser.js)

        function getBrowserInfo() {
            var nVer = navigator.appVersion;
            var nAgt = navigator.userAgent;
            var browserName = navigator.appName;
            var fullVersion = '' + parseFloat(navigator.appVersion);
            var majorVersion = parseInt(navigator.appVersion, 10);
            var nameOffset, verOffset, ix;

            // both and safri and chrome has same userAgent
            if (isSafari && !isChrome && nAgt.indexOf('CriOS') !== -1) {
                isSafari = false;
                isChrome = true;
            }

            // In Opera, the true version is after 'Opera' or after 'Version'
            if (isOpera) {
                browserName = 'Opera';
                try {
                    fullVersion = navigator.userAgent.split('OPR/')[1].split(' ')[0];
                    majorVersion = fullVersion.split('.')[0];
                } catch (e) {
                    fullVersion = '0.0.0.0';
                    majorVersion = 0;
                }
            }
            // In MSIE version <=10, the true version is after 'MSIE' in userAgent
            // In IE 11, look for the string after 'rv:'
            else if (isIE) {
                verOffset = nAgt.indexOf('rv:');
                if (verOffset > 0) { //IE 11
                    fullVersion = nAgt.substring(verOffset + 3);
                } else { //IE 10 or earlier
                    verOffset = nAgt.indexOf('MSIE');
                    fullVersion = nAgt.substring(verOffset + 5);
                }
                browserName = 'IE';
            }
            // In Chrome, the true version is after 'Chrome' 
            else if (isChrome) {
                verOffset = nAgt.indexOf('Chrome');
                browserName = 'Chrome';
                fullVersion = nAgt.substring(verOffset + 7);
            }
            // In Safari, the true version is after 'Safari' or after 'Version' 
            else if (isSafari) {
                verOffset = nAgt.indexOf('Safari');

                browserName = 'Safari';
                fullVersion = nAgt.substring(verOffset + 7);

                if ((verOffset = nAgt.indexOf('Version')) !== -1) {
                    fullVersion = nAgt.substring(verOffset + 8);
                }

                if (navigator.userAgent.indexOf('Version/') !== -1) {
                    fullVersion = navigator.userAgent.split('Version/')[1].split(' ')[0];
                }
            }
            // In Firefox, the true version is after 'Firefox' 
            else if (isFirefox) {
                verOffset = nAgt.indexOf('Firefox');
                browserName = 'Firefox';
                fullVersion = nAgt.substring(verOffset + 8);
            }

            // In most other browsers, 'name/version' is at the end of userAgent 
            else if ((nameOffset = nAgt.lastIndexOf(' ') + 1) < (verOffset = nAgt.lastIndexOf('/'))) {
                browserName = nAgt.substring(nameOffset, verOffset);
                fullVersion = nAgt.substring(verOffset + 1);

                if (browserName.toLowerCase() === browserName.toUpperCase()) {
                    browserName = navigator.appName;
                }
            }

            if (isEdge) {
                browserName = 'Edge';
                fullVersion = navigator.userAgent.split('Edge/')[1];
                // fullVersion = parseInt(navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)[2], 10).toString();
            }

            // trim the fullVersion string at semicolon/space/bracket if present
            if ((ix = fullVersion.search(/[; \)]/)) !== -1) {
                fullVersion = fullVersion.substring(0, ix);
            }

            majorVersion = parseInt('' + fullVersion, 10);

            if (isNaN(majorVersion)) {
                fullVersion = '' + parseFloat(navigator.appVersion);
                majorVersion = parseInt(navigator.appVersion, 10);
            }

            return {
                fullVersion: fullVersion,
                version: majorVersion,
                name: browserName,
                isPrivateBrowsing: false
            };
        }

        // via: https://gist.github.com/cou929/7973956

        function retry(isDone, next) {
            var currentTrial = 0,
                maxRetry = 50,
                interval = 10,
                isTimeout = false;
            var id = window.setInterval(
                function() {
                    if (isDone()) {
                        window.clearInterval(id);
                        next(isTimeout);
                    }
                    if (currentTrial++ > maxRetry) {
                        window.clearInterval(id);
                        isTimeout = true;
                        next(isTimeout);
                    }
                },
                10
            );
        }

        function isIE10OrLater(userAgent) {
            var ua = userAgent.toLowerCase();
            if (ua.indexOf('msie') === 0 && ua.indexOf('trident') === 0) {
                return false;
            }
            var match = /(?:msie|rv:)\s?([\d\.]+)/.exec(ua);
            if (match && parseInt(match[1], 10) >= 10) {
                return true;
            }
            return false;
        }

        function detectPrivateMode(callback) {
            var isPrivate;

            try {

                if (window.webkitRequestFileSystem) {
                    window.webkitRequestFileSystem(
                        window.TEMPORARY, 1,
                        function() {
                            isPrivate = false;
                        },
                        function(e) {
                            isPrivate = true;
                        }
                    );
                } else if (window.indexedDB && /Firefox/.test(window.navigator.userAgent)) {
                    var db;
                    try {
                        db = window.indexedDB.open('test');
                        db.onerror = function() {
                            return true;
                        };
                    } catch (e) {
                        isPrivate = true;
                    }

                    if (typeof isPrivate === 'undefined') {
                        retry(
                            function isDone() {
                                return db.readyState === 'done' ? true : false;
                            },
                            function next(isTimeout) {
                                if (!isTimeout) {
                                    isPrivate = db.result ? false : true;
                                }
                            }
                        );
                    }
                } else if (isIE10OrLater(window.navigator.userAgent)) {
                    isPrivate = false;
                    try {
                        if (!window.indexedDB) {
                            isPrivate = true;
                        }
                    } catch (e) {
                        isPrivate = true;
                    }
                } else if (window.localStorage && /Safari/.test(window.navigator.userAgent)) {
                    try {
                        window.localStorage.setItem('test', 1);
                    } catch (e) {
                        isPrivate = true;
                    }

                    if (typeof isPrivate === 'undefined') {
                        isPrivate = false;
                        window.localStorage.removeItem('test');
                    }
                }

            } catch (e) {
                isPrivate = false;
            }

            retry(
                function isDone() {
                    return typeof isPrivate !== 'undefined' ? true : false;
                },
                function next(isTimeout) {
                    callback(isPrivate);
                }
            );
        }

        var isMobile = {
            Android: function() {
                return navigator.userAgent.match(/Android/i);
            },
            BlackBerry: function() {
                return navigator.userAgent.match(/BlackBerry|BB10/i);
            },
            iOS: function() {
                return navigator.userAgent.match(/iPhone|iPad|iPod/i);
            },
            Opera: function() {
                return navigator.userAgent.match(/Opera Mini/i);
            },
            Windows: function() {
                return navigator.userAgent.match(/IEMobile/i);
            },
            any: function() {
                return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
            },
            getOsName: function() {
                var osName = 'Unknown OS';
                if (isMobile.Android()) {
                    osName = 'Android';
                }

                if (isMobile.BlackBerry()) {
                    osName = 'BlackBerry';
                }

                if (isMobile.iOS()) {
                    osName = 'iOS';
                }

                if (isMobile.Opera()) {
                    osName = 'Opera Mini';
                }

                if (isMobile.Windows()) {
                    osName = 'Windows';
                }

                return osName;
            }
        };

        // via: http://jsfiddle.net/ChristianL/AVyND/
        function detectDesktopOS() {
            var unknown = '-';

            var nVer = navigator.appVersion;
            var nAgt = navigator.userAgent;

            var os = unknown;
            var clientStrings = [{
                s: 'Windows 10',
                r: /(Windows 10.0|Windows NT 10.0)/
            }, {
                s: 'Windows 8.1',
                r: /(Windows 8.1|Windows NT 6.3)/
            }, {
                s: 'Windows 8',
                r: /(Windows 8|Windows NT 6.2)/
            }, {
                s: 'Windows 7',
                r: /(Windows 7|Windows NT 6.1)/
            }, {
                s: 'Windows Vista',
                r: /Windows NT 6.0/
            }, {
                s: 'Windows Server 2003',
                r: /Windows NT 5.2/
            }, {
                s: 'Windows XP',
                r: /(Windows NT 5.1|Windows XP)/
            }, {
                s: 'Windows 2000',
                r: /(Windows NT 5.0|Windows 2000)/
            }, {
                s: 'Windows ME',
                r: /(Win 9x 4.90|Windows ME)/
            }, {
                s: 'Windows 98',
                r: /(Windows 98|Win98)/
            }, {
                s: 'Windows 95',
                r: /(Windows 95|Win95|Windows_95)/
            }, {
                s: 'Windows NT 4.0',
                r: /(Windows NT 4.0|WinNT4.0|WinNT|Windows NT)/
            }, {
                s: 'Windows CE',
                r: /Windows CE/
            }, {
                s: 'Windows 3.11',
                r: /Win16/
            }, {
                s: 'Android',
                r: /Android/
            }, {
                s: 'Open BSD',
                r: /OpenBSD/
            }, {
                s: 'Sun OS',
                r: /SunOS/
            }, {
                s: 'Linux',
                r: /(Linux|X11)/
            }, {
                s: 'iOS',
                r: /(iPhone|iPad|iPod)/
            }, {
                s: 'Mac OS X',
                r: /Mac OS X/
            }, {
                s: 'Mac OS',
                r: /(MacPPC|MacIntel|Mac_PowerPC|Macintosh)/
            }, {
                s: 'QNX',
                r: /QNX/
            }, {
                s: 'UNIX',
                r: /UNIX/
            }, {
                s: 'BeOS',
                r: /BeOS/
            }, {
                s: 'OS/2',
                r: /OS\/2/
            }, {
                s: 'Search Bot',
                r: /(nuhk|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask Jeeves\/Teoma|ia_archiver)/
            }];
            for (var i = 0, cs; cs = clientStrings[i]; i++) {
                if (cs.r.test(nAgt)) {
                    os = cs.s;
                    break;
                }
            }

            var osVersion = unknown;

            if (/Windows/.test(os)) {
                if (/Windows (.*)/.test(os)) {
                    osVersion = /Windows (.*)/.exec(os)[1];
                }
                os = 'Windows';
            }

            switch (os) {
                case 'Mac OS X':
                    if (/Mac OS X (10[\.\_\d]+)/.test(nAgt)) {
                        osVersion = /Mac OS X (10[\.\_\d]+)/.exec(nAgt)[1];
                    }
                    break;
                case 'Android':
                    if (/Android ([\.\_\d]+)/.test(nAgt)) {
                        osVersion = /Android ([\.\_\d]+)/.exec(nAgt)[1];
                    }
                    break;
                case 'iOS':
                    if (/OS (\d+)_(\d+)_?(\d+)?/.test(nAgt)) {
                        osVersion = /OS (\d+)_(\d+)_?(\d+)?/.exec(nVer);
                        osVersion = osVersion[1] + '.' + osVersion[2] + '.' + (osVersion[3] | 0);
                    }
                    break;
            }

            return {
                osName: os,
                osVersion: osVersion
            };
        }

        var osName = 'Unknown OS';
        var osVersion = 'Unknown OS Version';

        function getAndroidVersion(ua) {
            ua = (ua || navigator.userAgent).toLowerCase();
            var match = ua.match(/android\s([0-9\.]*)/);
            return match ? match[1] : false;
        }

        var osInfo = detectDesktopOS();

        if (osInfo && osInfo.osName && osInfo.osName != '-') {
            osName = osInfo.osName;
            osVersion = osInfo.osVersion;
        } else if (isMobile.any()) {
            osName = isMobile.getOsName();

            if (osName == 'Android') {
                osVersion = getAndroidVersion();
            }
        }

        var isNodejs = typeof process === 'object' && typeof process.versions === 'object' && process.versions.node;

        if (osName === 'Unknown OS' && isNodejs) {
            osName = 'Nodejs';
            osVersion = process.versions.node.toString().replace('v', '');
        }

        var isCanvasSupportsStreamCapturing = false;
        var isVideoSupportsStreamCapturing = false;
        ['captureStream', 'mozCaptureStream', 'webkitCaptureStream'].forEach(function(item) {
            if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
                return;
            }

            if (!isCanvasSupportsStreamCapturing && item in document.createElement('canvas')) {
                isCanvasSupportsStreamCapturing = true;
            }

            if (!isVideoSupportsStreamCapturing && item in document.createElement('video')) {
                isVideoSupportsStreamCapturing = true;
            }
        });

        var regexIpv4Local = /^(192\.168\.|169\.254\.|10\.|172\.(1[6-9]|2\d|3[01]))/,
            regexIpv4 = /([0-9]{1,3}(\.[0-9]{1,3}){3})/,
            regexIpv6 = /[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7}/;

        // via: https://github.com/diafygi/webrtc-ips
        function DetectLocalIPAddress(callback, stream) {
            if (!DetectRTC.isWebRTCSupported) {
                return;
            }

            var isPublic = true,
                isIpv4 = true;
            getIPs(function(ip) {
                if (!ip) {
                    callback(); // Pass nothing to tell that ICE-gathering-ended
                } else if (ip.match(regexIpv4Local)) {
                    isPublic = false;
                    callback('Local: ' + ip, isPublic, isIpv4);
                } else if (ip.match(regexIpv6)) { //via https://ourcodeworld.com/articles/read/257/how-to-get-the-client-ip-address-with-javascript-only
                    isIpv4 = false;
                    callback('Public: ' + ip, isPublic, isIpv4);
                } else {
                    callback('Public: ' + ip, isPublic, isIpv4);
                }
            }, stream);
        }

        function getIPs(callback, stream) {
            if (typeof document === 'undefined' || typeof document.getElementById !== 'function') {
                return;
            }

            var ipDuplicates = {};

            var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;

            if (!RTCPeerConnection) {
                var iframe = document.getElementById('iframe');
                if (!iframe) {
                    return;
                }
                var win = iframe.contentWindow;
                RTCPeerConnection = win.RTCPeerConnection || win.mozRTCPeerConnection || win.webkitRTCPeerConnection;
            }

            if (!RTCPeerConnection) {
                return;
            }

            var peerConfig = null;

            if (DetectRTC.browser === 'Chrome' && DetectRTC.browser.version < 58) {
                // todo: add support for older Opera
                peerConfig = {
                    optional: [{
                        RtpDataChannels: true
                    }]
                };
            }

            var servers = {
                iceServers: [{
                    urls: 'stun:stun.l.google.com:19302'
                }]
            };

            var pc = new RTCPeerConnection(servers, peerConfig);

            if (stream) {
                if (pc.addStream) {
                    pc.addStream(stream);
                } else if (pc.addTrack && stream.getTracks()[0]) {
                    pc.addTrack(stream.getTracks()[0], stream);
                }
            }

            function handleCandidate(candidate) {
                if (!candidate) {
                    callback(); // Pass nothing to tell that ICE-gathering-ended
                    return;
                }

                var match = regexIpv4.exec(candidate);
                if (!match) {
                    return;
                }
                var ipAddress = match[1];
                var isPublic = (candidate.match(regexIpv4Local)),
                    isIpv4 = true;

                if (ipDuplicates[ipAddress] === undefined) {
                    callback(ipAddress, isPublic, isIpv4);
                }

                ipDuplicates[ipAddress] = true;
            }

            // listen for candidate events
            pc.onicecandidate = function(event) {
                if (event.candidate && event.candidate.candidate) {
                    handleCandidate(event.candidate.candidate);
                } else {
                    handleCandidate(); // Pass nothing to tell that ICE-gathering-ended
                }
            };

            // create data channel
            if (!stream) {
                try {
                    pc.createDataChannel('sctp', {});
                } catch (e) {}
            }

            // create an offer sdp
            if (DetectRTC.isPromisesSupported) {
                pc.createOffer().then(function(result) {
                    pc.setLocalDescription(result).then(afterCreateOffer);
                });
            } else {
                pc.createOffer(function(result) {
                    pc.setLocalDescription(result, afterCreateOffer, function() {});
                }, function() {});
            }

            function afterCreateOffer() {
                var lines = pc.localDescription.sdp.split('\n');

                lines.forEach(function(line) {
                    if (line && line.indexOf('a=candidate:') === 0) {
                        handleCandidate(line);
                    }
                });
            }
        }

        var MediaDevices = [];

        var audioInputDevices = [];
        var audioOutputDevices = [];
        var videoInputDevices = [];

        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            // Firefox 38+ seems having support of enumerateDevices
            // Thanks @xdumaine/enumerateDevices
            navigator.enumerateDevices = function(callback) {
                var enumerateDevices = navigator.mediaDevices.enumerateDevices();
                if (enumerateDevices && enumerateDevices.then) {
                    navigator.mediaDevices.enumerateDevices().then(callback).catch(function() {
                        callback([]);
                    });
                } else {
                    callback([]);
                }
            };
        }

        // Media Devices detection
        var canEnumerate = false;

        /*global MediaStreamTrack:true */
        if (typeof MediaStreamTrack !== 'undefined' && 'getSources' in MediaStreamTrack) {
            canEnumerate = true;
        } else if (navigator.mediaDevices && !!navigator.mediaDevices.enumerateDevices) {
            canEnumerate = true;
        }

        var hasMicrophone = false;
        var hasSpeakers = false;
        var hasWebcam = false;

        var isWebsiteHasMicrophonePermissions = false;
        var isWebsiteHasWebcamPermissions = false;

        // http://dev.w3.org/2011/webrtc/editor/getusermedia.html#mediadevices
        function checkDeviceSupport(callback) {
            if (!canEnumerate) {
                if (callback) {
                    callback();
                }
                return;
            }

            if (!navigator.enumerateDevices && window.MediaStreamTrack && window.MediaStreamTrack.getSources) {
                navigator.enumerateDevices = window.MediaStreamTrack.getSources.bind(window.MediaStreamTrack);
            }

            if (!navigator.enumerateDevices && navigator.enumerateDevices) {
                navigator.enumerateDevices = navigator.enumerateDevices.bind(navigator);
            }

            if (!navigator.enumerateDevices) {
                if (callback) {
                    callback();
                }
                return;
            }

            MediaDevices = [];

            audioInputDevices = [];
            audioOutputDevices = [];
            videoInputDevices = [];

            hasMicrophone = false;
            hasSpeakers = false;
            hasWebcam = false;

            isWebsiteHasMicrophonePermissions = false;
            isWebsiteHasWebcamPermissions = false;

            // to prevent duplication
            var alreadyUsedDevices = {};

            navigator.enumerateDevices(function(devices) {
                devices.forEach(function(_device) {
                    var device = {};
                    for (var d in _device) {
                        try {
                            if (typeof _device[d] !== 'function') {
                                device[d] = _device[d];
                            }
                        } catch (e) {}
                    }

                    if (alreadyUsedDevices[device.deviceId + device.label + device.kind]) {
                        return;
                    }

                    // if it is MediaStreamTrack.getSources
                    if (device.kind === 'audio') {
                        device.kind = 'audioinput';
                    }

                    if (device.kind === 'video') {
                        device.kind = 'videoinput';
                    }

                    if (!device.deviceId) {
                        device.deviceId = device.id;
                    }

                    if (!device.id) {
                        device.id = device.deviceId;
                    }

                    if (!device.label) {
                        device.isCustomLabel = true;

                        if (device.kind === 'videoinput') {
                            device.label = 'Camera ' + (videoInputDevices.length + 1);
                        } else if (device.kind === 'audioinput') {
                            device.label = 'Microphone ' + (audioInputDevices.length + 1);
                        } else if (device.kind === 'audiooutput') {
                            device.label = 'Speaker ' + (audioOutputDevices.length + 1);
                        } else {
                            device.label = 'Please invoke getUserMedia once.';
                        }

                        if (typeof DetectRTC !== 'undefined' && DetectRTC.browser.isChrome && DetectRTC.browser.version >= 46 && !/^(https:|chrome-extension:)$/g.test(location.protocol || '')) {
                            if (typeof document !== 'undefined' && typeof document.domain === 'string' && document.domain.search && document.domain.search(/localhost|127.0./g) === -1) {
                                device.label = 'HTTPs is required to get label of this ' + device.kind + ' device.';
                            }
                        }
                    } else {
                        // Firefox on Android still returns empty label
                        if (device.kind === 'videoinput' && !isWebsiteHasWebcamPermissions) {
                            isWebsiteHasWebcamPermissions = true;
                        }

                        if (device.kind === 'audioinput' && !isWebsiteHasMicrophonePermissions) {
                            isWebsiteHasMicrophonePermissions = true;
                        }
                    }

                    if (device.kind === 'audioinput') {
                        hasMicrophone = true;

                        if (audioInputDevices.indexOf(device) === -1) {
                            audioInputDevices.push(device);
                        }
                    }

                    if (device.kind === 'audiooutput') {
                        hasSpeakers = true;

                        if (audioOutputDevices.indexOf(device) === -1) {
                            audioOutputDevices.push(device);
                        }
                    }

                    if (device.kind === 'videoinput') {
                        hasWebcam = true;

                        if (videoInputDevices.indexOf(device) === -1) {
                            videoInputDevices.push(device);
                        }
                    }

                    // there is no 'videoouput' in the spec.
                    MediaDevices.push(device);

                    alreadyUsedDevices[device.deviceId + device.label + device.kind] = device;
                });

                if (typeof DetectRTC !== 'undefined') {
                    // to sync latest outputs
                    DetectRTC.MediaDevices = MediaDevices;
                    DetectRTC.hasMicrophone = hasMicrophone;
                    DetectRTC.hasSpeakers = hasSpeakers;
                    DetectRTC.hasWebcam = hasWebcam;

                    DetectRTC.isWebsiteHasWebcamPermissions = isWebsiteHasWebcamPermissions;
                    DetectRTC.isWebsiteHasMicrophonePermissions = isWebsiteHasMicrophonePermissions;

                    DetectRTC.audioInputDevices = audioInputDevices;
                    DetectRTC.audioOutputDevices = audioOutputDevices;
                    DetectRTC.videoInputDevices = videoInputDevices;
                }

                if (callback) {
                    callback();
                }
            });
        }

        var DetectRTC = window.DetectRTC || {};

        // ----------
        // DetectRTC.browser.name || DetectRTC.browser.version || DetectRTC.browser.fullVersion
        DetectRTC.browser = getBrowserInfo();

        detectPrivateMode(function(isPrivateBrowsing) {
            DetectRTC.browser.isPrivateBrowsing = !!isPrivateBrowsing;
        });

        // DetectRTC.isChrome || DetectRTC.isFirefox || DetectRTC.isEdge
        DetectRTC.browser['is' + DetectRTC.browser.name] = true;

        // -----------
        DetectRTC.osName = osName;
        DetectRTC.osVersion = osVersion;

        var isNodeWebkit = typeof process === 'object' && typeof process.versions === 'object' && process.versions['node-webkit'];

        // --------- Detect if system supports WebRTC 1.0 or WebRTC 1.1.
        var isWebRTCSupported = false;
        ['RTCPeerConnection', 'webkitRTCPeerConnection', 'mozRTCPeerConnection', 'RTCIceGatherer'].forEach(function(item) {
            if (isWebRTCSupported) {
                return;
            }

            if (item in window) {
                isWebRTCSupported = true;
            }
        });
        DetectRTC.isWebRTCSupported = isWebRTCSupported;

        //-------
        DetectRTC.isORTCSupported = typeof RTCIceGatherer !== 'undefined';

        // --------- Detect if system supports screen capturing API
        var isScreenCapturingSupported = false;
        if (DetectRTC.browser.isChrome && DetectRTC.browser.version >= 35) {
            isScreenCapturingSupported = true;
        } else if (DetectRTC.browser.isFirefox && DetectRTC.browser.version >= 34) {
            isScreenCapturingSupported = true;
        } else if (DetectRTC.browser.isEdge && DetectRTC.browser.version >= 17) {
            isScreenCapturingSupported = true; // navigator.getDisplayMedia
        } else if (DetectRTC.osName === 'Android' && DetectRTC.browser.isChrome) {
            isScreenCapturingSupported = true;
        }

        if (!/^(https:|chrome-extension:)$/g.test(location.protocol || '')) {
            var isNonLocalHost = typeof document !== 'undefined' && typeof document.domain === 'string' && document.domain.search && document.domain.search(/localhost|127.0./g) === -1;
            if (isNonLocalHost && (DetectRTC.browser.isChrome || DetectRTC.browser.isEdge || DetectRTC.browser.isOpera)) {
                isScreenCapturingSupported = false;
            } else if (DetectRTC.browser.isFirefox) {
                isScreenCapturingSupported = false;
            }
        }
        DetectRTC.isScreenCapturingSupported = isScreenCapturingSupported;

        // --------- Detect if WebAudio API are supported
        var webAudio = {
            isSupported: false,
            isCreateMediaStreamSourceSupported: false
        };

        ['AudioContext', 'webkitAudioContext', 'mozAudioContext', 'msAudioContext'].forEach(function(item) {
            if (webAudio.isSupported) {
                return;
            }

            if (item in window) {
                webAudio.isSupported = true;

                if (window[item] && 'createMediaStreamSource' in window[item].prototype) {
                    webAudio.isCreateMediaStreamSourceSupported = true;
                }
            }
        });
        DetectRTC.isAudioContextSupported = webAudio.isSupported;
        DetectRTC.isCreateMediaStreamSourceSupported = webAudio.isCreateMediaStreamSourceSupported;

        // ---------- Detect if SCTP/RTP channels are supported.

        var isRtpDataChannelsSupported = false;
        if (DetectRTC.browser.isChrome && DetectRTC.browser.version > 31) {
            isRtpDataChannelsSupported = true;
        }
        DetectRTC.isRtpDataChannelsSupported = isRtpDataChannelsSupported;

        var isSCTPSupportd = false;
        if (DetectRTC.browser.isFirefox && DetectRTC.browser.version > 28) {
            isSCTPSupportd = true;
        } else if (DetectRTC.browser.isChrome && DetectRTC.browser.version > 25) {
            isSCTPSupportd = true;
        } else if (DetectRTC.browser.isOpera && DetectRTC.browser.version >= 11) {
            isSCTPSupportd = true;
        }
        DetectRTC.isSctpDataChannelsSupported = isSCTPSupportd;

        // ---------

        DetectRTC.isMobileDevice = isMobileDevice; // "isMobileDevice" boolean is defined in "getBrowserInfo.js"

        // ------
        var isGetUserMediaSupported = false;
        if (navigator.getUserMedia) {
            isGetUserMediaSupported = true;
        } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            isGetUserMediaSupported = true;
        }

        if (DetectRTC.browser.isChrome && DetectRTC.browser.version >= 46 && !/^(https:|chrome-extension:)$/g.test(location.protocol || '')) {
            if (typeof document !== 'undefined' && typeof document.domain === 'string' && document.domain.search && document.domain.search(/localhost|127.0./g) === -1) {
                isGetUserMediaSupported = 'Requires HTTPs';
            }
        }

        if (DetectRTC.osName === 'Nodejs') {
            isGetUserMediaSupported = false;
        }
        DetectRTC.isGetUserMediaSupported = isGetUserMediaSupported;

        var displayResolution = '';
        if (screen.width) {
            var width = (screen.width) ? screen.width : '';
            var height = (screen.height) ? screen.height : '';
            displayResolution += '' + width + ' x ' + height;
        }
        DetectRTC.displayResolution = displayResolution;

        function getAspectRatio(w, h) {
            function gcd(a, b) {
                return (b == 0) ? a : gcd(b, a % b);
            }
            var r = gcd(w, h);
            return (w / r) / (h / r);
        }

        DetectRTC.displayAspectRatio = getAspectRatio(screen.width, screen.height).toFixed(2);

        // ----------
        DetectRTC.isCanvasSupportsStreamCapturing = isCanvasSupportsStreamCapturing;
        DetectRTC.isVideoSupportsStreamCapturing = isVideoSupportsStreamCapturing;

        if (DetectRTC.browser.name == 'Chrome' && DetectRTC.browser.version >= 53) {
            if (!DetectRTC.isCanvasSupportsStreamCapturing) {
                DetectRTC.isCanvasSupportsStreamCapturing = 'Requires chrome flag: enable-experimental-web-platform-features';
            }

            if (!DetectRTC.isVideoSupportsStreamCapturing) {
                DetectRTC.isVideoSupportsStreamCapturing = 'Requires chrome flag: enable-experimental-web-platform-features';
            }
        }

        // ------
        DetectRTC.DetectLocalIPAddress = DetectLocalIPAddress;

        DetectRTC.isWebSocketsSupported = 'WebSocket' in window && 2 === window.WebSocket.CLOSING;
        DetectRTC.isWebSocketsBlocked = !DetectRTC.isWebSocketsSupported;

        if (DetectRTC.osName === 'Nodejs') {
            DetectRTC.isWebSocketsSupported = true;
            DetectRTC.isWebSocketsBlocked = false;
        }

        DetectRTC.checkWebSocketsSupport = function(callback) {
            callback = callback || function() {};
            try {
                var starttime;
                var websocket = new WebSocket('wss://echo.websocket.org:443/');
                websocket.onopen = function() {
                    DetectRTC.isWebSocketsBlocked = false;
                    starttime = (new Date).getTime();
                    websocket.send('ping');
                };
                websocket.onmessage = function() {
                    DetectRTC.WebsocketLatency = (new Date).getTime() - starttime + 'ms';
                    callback();
                    websocket.close();
                    websocket = null;
                };
                websocket.onerror = function() {
                    DetectRTC.isWebSocketsBlocked = true;
                    callback();
                };
            } catch (e) {
                DetectRTC.isWebSocketsBlocked = true;
                callback();
            }
        };

        // -------
        DetectRTC.load = function(callback) {
            callback = callback || function() {};
            checkDeviceSupport(callback);
        };

        // check for microphone/camera support!
        if (typeof checkDeviceSupport === 'function') {
            // checkDeviceSupport();
        }

        if (typeof MediaDevices !== 'undefined') {
            DetectRTC.MediaDevices = MediaDevices;
        } else {
            DetectRTC.MediaDevices = [];
        }

        DetectRTC.hasMicrophone = hasMicrophone;
        DetectRTC.hasSpeakers = hasSpeakers;
        DetectRTC.hasWebcam = hasWebcam;

        DetectRTC.isWebsiteHasWebcamPermissions = isWebsiteHasWebcamPermissions;
        DetectRTC.isWebsiteHasMicrophonePermissions = isWebsiteHasMicrophonePermissions;

        DetectRTC.audioInputDevices = audioInputDevices;
        DetectRTC.audioOutputDevices = audioOutputDevices;
        DetectRTC.videoInputDevices = videoInputDevices;

        // ------
        var isSetSinkIdSupported = false;
        if (typeof document !== 'undefined' && typeof document.createElement === 'function' && 'setSinkId' in document.createElement('video')) {
            isSetSinkIdSupported = true;
        }
        DetectRTC.isSetSinkIdSupported = isSetSinkIdSupported;

        // -----
        var isRTPSenderReplaceTracksSupported = false;
        if (DetectRTC.browser.isFirefox && typeof mozRTCPeerConnection !== 'undefined' /*&& DetectRTC.browser.version > 39*/ ) {
            /*global mozRTCPeerConnection:true */
            if ('getSenders' in mozRTCPeerConnection.prototype) {
                isRTPSenderReplaceTracksSupported = true;
            }
        } else if (DetectRTC.browser.isChrome && typeof webkitRTCPeerConnection !== 'undefined') {
            /*global webkitRTCPeerConnection:true */
            if ('getSenders' in webkitRTCPeerConnection.prototype) {
                isRTPSenderReplaceTracksSupported = true;
            }
        }
        DetectRTC.isRTPSenderReplaceTracksSupported = isRTPSenderReplaceTracksSupported;

        //------
        var isRemoteStreamProcessingSupported = false;
        if (DetectRTC.browser.isFirefox && DetectRTC.browser.version > 38) {
            isRemoteStreamProcessingSupported = true;
        }
        DetectRTC.isRemoteStreamProcessingSupported = isRemoteStreamProcessingSupported;

        //-------
        var isApplyConstraintsSupported = false;

        /*global MediaStreamTrack:true */
        if (typeof MediaStreamTrack !== 'undefined' && 'applyConstraints' in MediaStreamTrack.prototype) {
            isApplyConstraintsSupported = true;
        }
        DetectRTC.isApplyConstraintsSupported = isApplyConstraintsSupported;

        //-------
        var isMultiMonitorScreenCapturingSupported = false;
        if (DetectRTC.browser.isFirefox && DetectRTC.browser.version >= 43) {
            // version 43 merely supports platforms for multi-monitors
            // version 44 will support exact multi-monitor selection i.e. you can select any monitor for screen capturing.
            isMultiMonitorScreenCapturingSupported = true;
        }
        DetectRTC.isMultiMonitorScreenCapturingSupported = isMultiMonitorScreenCapturingSupported;

        DetectRTC.isPromisesSupported = !!('Promise' in window);

        // version is generated by "grunt"
        DetectRTC.version = '1.3.9';

        if (typeof DetectRTC === 'undefined') {
            window.DetectRTC = {};
        }

        var MediaStream = window.MediaStream;

        if (typeof MediaStream === 'undefined' && typeof webkitMediaStream !== 'undefined') {
            MediaStream = webkitMediaStream;
        }

        if (typeof MediaStream !== 'undefined' && typeof MediaStream === 'function') {
            DetectRTC.MediaStream = Object.keys(MediaStream.prototype);
        } else DetectRTC.MediaStream = false;

        if (typeof MediaStreamTrack !== 'undefined') {
            DetectRTC.MediaStreamTrack = Object.keys(MediaStreamTrack.prototype);
        } else DetectRTC.MediaStreamTrack = false;

        var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;

        if (typeof RTCPeerConnection !== 'undefined') {
            DetectRTC.RTCPeerConnection = Object.keys(RTCPeerConnection.prototype);
        } else DetectRTC.RTCPeerConnection = false;

        window.DetectRTC = DetectRTC;

        if (true /* && !!module.exports*/ ) {
            module.exports = DetectRTC;
        }

        if (true) {
            !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = (function() {
                return DetectRTC;
            }).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
        }
    })();

    // globals.js

    if (typeof cordova !== 'undefined') {
        DetectRTC.isMobileDevice = true;
        DetectRTC.browser.name = 'Chrome';
    }

    if (navigator && navigator.userAgent && navigator.userAgent.indexOf('Crosswalk') !== -1) {
        DetectRTC.isMobileDevice = true;
        DetectRTC.browser.name = 'Chrome';
    }

    function fireEvent(obj, eventName, args) {
        if (typeof CustomEvent === 'undefined') {
            return;
        }

        var eventDetail = {
            arguments: args,
            __exposedProps__: args
        };

        var event = new CustomEvent(eventName, eventDetail);
        obj.dispatchEvent(event);
    }

    function setHarkEvents(connection, streamEvent) {
        if (!streamEvent.stream || !getTracks(streamEvent.stream, 'audio').length) return;

        if (!connection || !streamEvent) {
            throw 'Both arguments are required.';
        }

        if (!connection.onspeaking || !connection.onsilence) {
            return;
        }

        if (typeof hark === 'undefined') {
            throw 'hark.js not found.';
        }

        hark(streamEvent.stream, {
            onspeaking: function() {
                connection.onspeaking(streamEvent);
            },
            onsilence: function() {
                connection.onsilence(streamEvent);
            },
            onvolumechange: function(volume, threshold) {
                if (!connection.onvolumechange) {
                    return;
                }
                connection.onvolumechange(merge({
                    volume: volume,
                    threshold: threshold
                }, streamEvent));
            }
        });
    }

    function setMuteHandlers(connection, streamEvent) {
        if (!streamEvent.stream || !streamEvent.stream || !streamEvent.stream.addEventListener) return;

        streamEvent.stream.addEventListener('mute', function(event) {
            event = connection.streamEvents[streamEvent.streamid];

            event.session = {
                audio: event.muteType === 'audio',
                video: event.muteType === 'video'
            };

            connection.onmute(event);
        }, false);

        streamEvent.stream.addEventListener('unmute', function(event) {
            event = connection.streamEvents[streamEvent.streamid];

            event.session = {
                audio: event.unmuteType === 'audio',
                video: event.unmuteType === 'video'
            };

            connection.onunmute(event);
        }, false);
    }

    function getRandomString() {
        if (window.crypto && window.crypto.getRandomValues && navigator.userAgent.indexOf('Safari') === -1) {
            var a = window.crypto.getRandomValues(new Uint32Array(3)),
                token = '';
            for (var i = 0, l = a.length; i < l; i++) {
                token += a[i].toString(36);
            }
            return token;
        } else {
            return (Math.random() * new Date().getTime()).toString(36).replace(/\./g, '');
        }
    }

    // Get HTMLAudioElement/HTMLVideoElement accordingly
    // todo: add API documentation for connection.autoCreateMediaElement

    function getRMCMediaElement(stream, callback, connection) {
        if (!connection.autoCreateMediaElement) {
            callback({});
            return;
        }

        var isAudioOnly = false;
        if (!getTracks(stream, 'video').length && !stream.isVideo && !stream.isScreen) {
            isAudioOnly = true;
        }

        if (DetectRTC.browser.name === 'Firefox') {
            if (connection.session.video || connection.session.screen) {
                isAudioOnly = false;
            }
        }

        var mediaElement = document.createElement(isAudioOnly ? 'audio' : 'video');

        mediaElement.srcObject = stream;

        mediaElement.setAttribute('autoplay', true);
        mediaElement.setAttribute('playsinline', true);
        mediaElement.setAttribute('controls', true);
        mediaElement.setAttribute('muted', false);
        mediaElement.setAttribute('volume', 1);

        // http://goo.gl/WZ5nFl
        // Firefox don't yet support onended for any stream (remote/local)
        if (DetectRTC.browser.name === 'Firefox') {
            var streamEndedEvent = 'ended';

            if ('oninactive' in mediaElement) {
                streamEndedEvent = 'inactive';
            }

            mediaElement.addEventListener(streamEndedEvent, function() {
                // fireEvent(stream, streamEndedEvent, stream);
                currentUserMediaRequest.remove(stream.idInstance);

                if (stream.type === 'local') {
                    streamEndedEvent = 'ended';

                    if ('oninactive' in stream) {
                        streamEndedEvent = 'inactive';
                    }

                    StreamsHandler.onSyncNeeded(stream.streamid, streamEndedEvent);

                    connection.attachStreams.forEach(function(aStream, idx) {
                        if (stream.streamid === aStream.streamid) {
                            delete connection.attachStreams[idx];
                        }
                    });

                    var newStreamsArray = [];
                    connection.attachStreams.forEach(function(aStream) {
                        if (aStream) {
                            newStreamsArray.push(aStream);
                        }
                    });
                    connection.attachStreams = newStreamsArray;

                    var streamEvent = connection.streamEvents[stream.streamid];

                    if (streamEvent) {
                        connection.onstreamended(streamEvent);
                        return;
                    }
                    if (this.parentNode) {
                        this.parentNode.removeChild(this);
                    }
                }
            }, false);
        }

        var played = mediaElement.play();
        if (typeof played !== 'undefined') {
            var cbFired = false;
            setTimeout(function() {
                if (!cbFired) {
                    cbFired = true;
                    callback(mediaElement);
                }
            }, 1000);
            played.then(function() {
                if (cbFired) return;
                cbFired = true;
                callback(mediaElement);
            }).catch(function(error) {
                if (cbFired) return;
                cbFired = true;
                callback(mediaElement);
            });
        } else {
            callback(mediaElement);
        }
    }

    // if IE
    if (!window.addEventListener) {
        window.addEventListener = function(el, eventName, eventHandler) {
            if (!el.attachEvent) {
                return;
            }
            el.attachEvent('on' + eventName, eventHandler);
        };
    }

    function listenEventHandler(eventName, eventHandler) {
        window.removeEventListener(eventName, eventHandler);
        window.addEventListener(eventName, eventHandler, false);
    }

    window.attachEventListener = function(video, type, listener, useCapture) {
        video.addEventListener(type, listener, useCapture);
    };

    function removeNullEntries(array) {
        var newArray = [];
        array.forEach(function(item) {
            if (item) {
                newArray.push(item);
            }
        });
        return newArray;
    }


    function isData(session) {
        return !session.audio && !session.video && !session.screen && session.data;
    }

    function isNull(obj) {
        return typeof obj === 'undefined';
    }

    function isString(obj) {
        return typeof obj === 'string';
    }

    var MediaStream = window.MediaStream;

    if (typeof MediaStream === 'undefined' && typeof webkitMediaStream !== 'undefined') {
        MediaStream = webkitMediaStream;
    }

    /*global MediaStream:true */
    if (typeof MediaStream !== 'undefined') {
        if (!('stop' in MediaStream.prototype)) {
            MediaStream.prototype.stop = function() {
                this.getTracks().forEach(function(track) {
                    track.stop();
                });
            };
        }
    }

    function isAudioPlusTab(connection, audioPlusTab) {
        if (connection.session.audio && connection.session.audio === 'two-way') {
            return false;
        }

        if (DetectRTC.browser.name === 'Firefox' && audioPlusTab !== false) {
            return true;
        }

        if (DetectRTC.browser.name !== 'Chrome' || DetectRTC.browser.version < 50) return false;

        if (typeof audioPlusTab === true) {
            return true;
        }

        if (typeof audioPlusTab === 'undefined' && connection.session.audio && connection.session.screen && !connection.session.video) {
            audioPlusTab = true;
            return true;
        }

        return false;
    }

    function getAudioScreenConstraints(screen_constraints) {
        if (DetectRTC.browser.name === 'Firefox') {
            return true;
        }

        if (DetectRTC.browser.name !== 'Chrome') return false;

        return {
            mandatory: {
                chromeMediaSource: screen_constraints.mandatory.chromeMediaSource,
                chromeMediaSourceId: screen_constraints.mandatory.chromeMediaSourceId
            }
        };
    }

    window.iOSDefaultAudioOutputDevice = window.iOSDefaultAudioOutputDevice || 'speaker'; // earpiece or speaker

    function getTracks(stream, kind) {
        if (!stream || !stream.getTracks) {
            return [];
        }

        return stream.getTracks().filter(function(t) {
            return t.kind === (kind || 'audio');
        });
    }

    function isUnifiedPlanSupportedDefault() {
        var canAddTransceiver = false;

        try {
            if (typeof RTCRtpTransceiver === 'undefined') return false;
            if (!('currentDirection' in RTCRtpTransceiver.prototype)) return false;

            var tempPc = new RTCPeerConnection();

            try {
                tempPc.addTransceiver('audio');
                canAddTransceiver = true;
            } catch (e) {}

            tempPc.close();
        } catch (e) {
            canAddTransceiver = false;
        }

        return canAddTransceiver && isUnifiedPlanSuppored();
    }

    function isUnifiedPlanSuppored() {
        var isUnifiedPlanSupported = false;

        try {
            var pc = new RTCPeerConnection({
                sdpSemantics: 'unified-plan'
            });

            try {
                var config = pc.getConfiguration();
                if (config.sdpSemantics == 'unified-plan')
                    isUnifiedPlanSupported = true;
                else if (config.sdpSemantics == 'plan-b')
                    isUnifiedPlanSupported = false;
                else
                    isUnifiedPlanSupported = false;
            } catch (e) {
                isUnifiedPlanSupported = false;
            }
        } catch (e) {
            isUnifiedPlanSupported = false;
        }

        return isUnifiedPlanSupported;
    }

    // ios-hacks.js

    function setCordovaAPIs() {
        // if (DetectRTC.osName !== 'iOS') return;
        if (typeof cordova === 'undefined' || typeof cordova.plugins === 'undefined' || typeof cordova.plugins.iosrtc === 'undefined') return;

        var iosrtc = cordova.plugins.iosrtc;
        window.webkitRTCPeerConnection = iosrtc.RTCPeerConnection;
        window.RTCSessionDescription = iosrtc.RTCSessionDescription;
        window.RTCIceCandidate = iosrtc.RTCIceCandidate;
        window.MediaStream = iosrtc.MediaStream;
        window.MediaStreamTrack = iosrtc.MediaStreamTrack;
        navigator.getUserMedia = navigator.webkitGetUserMedia = iosrtc.getUserMedia;

        iosrtc.debug.enable('iosrtc*');
        if (typeof iosrtc.selectAudioOutput == 'function') {
            iosrtc.selectAudioOutput(window.iOSDefaultAudioOutputDevice || 'speaker'); // earpiece or speaker
        }
        iosrtc.registerGlobals();
    }

    document.addEventListener('deviceready', setCordovaAPIs, false);
    setCordovaAPIs();

    // RTCPeerConnection.js

    var defaults = {};

    function setSdpConstraints(config) {
        var sdpConstraints = {
            OfferToReceiveAudio: !!config.OfferToReceiveAudio,
            OfferToReceiveVideo: !!config.OfferToReceiveVideo
        };

        return sdpConstraints;
    }

    var RTCPeerConnection;
    if (typeof window.RTCPeerConnection !== 'undefined') {
        RTCPeerConnection = window.RTCPeerConnection;
    } else if (typeof mozRTCPeerConnection !== 'undefined') {
        RTCPeerConnection = mozRTCPeerConnection;
    } else if (typeof webkitRTCPeerConnection !== 'undefined') {
        RTCPeerConnection = webkitRTCPeerConnection;
    }

    var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
    var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;
    var MediaStreamTrack = window.MediaStreamTrack;

    function PeerInitiator(config) {
        if (typeof window.RTCPeerConnection !== 'undefined') {
            RTCPeerConnection = window.RTCPeerConnection;
        } else if (typeof mozRTCPeerConnection !== 'undefined') {
            RTCPeerConnection = mozRTCPeerConnection;
        } else if (typeof webkitRTCPeerConnection !== 'undefined') {
            RTCPeerConnection = webkitRTCPeerConnection;
        }

        RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
        RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;
        MediaStreamTrack = window.MediaStreamTrack;

        if (!RTCPeerConnection) {
            throw 'WebRTC 1.0 (RTCPeerConnection) API are NOT available in this browser.';
        }

        var connection = config.rtcMultiConnection;

        this.extra = config.remoteSdp ? config.remoteSdp.extra : connection.extra;
        this.userid = config.userid;
        this.streams = [];
        this.channels = config.channels || [];
        this.connectionDescription = config.connectionDescription;

        this.addStream = function(session) {
            connection.addStream(session, self.userid);
        };

        this.removeStream = function(streamid) {
            connection.removeStream(streamid, self.userid);
        };

        var self = this;

        if (config.remoteSdp) {
            this.connectionDescription = config.remoteSdp.connectionDescription;
        }

        var allRemoteStreams = {};

        defaults.sdpConstraints = setSdpConstraints({
            OfferToReceiveAudio: true,
            OfferToReceiveVideo: true
        });

        var peer;

        var renegotiatingPeer = !!config.renegotiatingPeer;
        if (config.remoteSdp) {
            renegotiatingPeer = !!config.remoteSdp.renegotiatingPeer;
        }

        var localStreams = [];
        connection.attachStreams.forEach(function(stream) {
            if (!!stream) {
                localStreams.push(stream);
            }
        });

        if (!renegotiatingPeer) {
            var iceTransports = 'all';
            if (connection.candidates.turn || connection.candidates.relay) {
                if (!connection.candidates.stun && !connection.candidates.reflexive && !connection.candidates.host) {
                    iceTransports = 'relay';
                }
            }

            try {
                // ref: developer.mozilla.org/en-US/docs/Web/API/RTCConfiguration
                var params = {
                    iceServers: connection.iceServers,
                    iceTransportPolicy: connection.iceTransportPolicy || iceTransports
                };

                if (typeof connection.iceCandidatePoolSize !== 'undefined') {
                    params.iceCandidatePoolSize = connection.iceCandidatePoolSize;
                }

                if (typeof connection.bundlePolicy !== 'undefined') {
                    params.bundlePolicy = connection.bundlePolicy;
                }

                if (typeof connection.rtcpMuxPolicy !== 'undefined') {
                    params.rtcpMuxPolicy = connection.rtcpMuxPolicy;
                }

                if (!!connection.sdpSemantics) {
                    params.sdpSemantics = connection.sdpSemantics || 'unified-plan';
                }

                if (!connection.iceServers || !connection.iceServers.length) {
                    params = null;
                    connection.optionalArgument = null;
                }

                peer = new RTCPeerConnection(params, connection.optionalArgument);
            } catch (e) {
                try {
                    var params = {
                        iceServers: connection.iceServers
                    };

                    peer = new RTCPeerConnection(params);
                } catch (e) {
                    peer = new RTCPeerConnection();
                }
            }
        } else {
            peer = config.peerRef;
        }

        if (!peer.getRemoteStreams && peer.getReceivers) {
            peer.getRemoteStreams = function() {
                var stream = new MediaStream();
                peer.getReceivers().forEach(function(receiver) {
                    stream.addTrack(receiver.track);
                });
                return [stream];
            };
        }

        if (!peer.getLocalStreams && peer.getSenders) {
            peer.getLocalStreams = function() {
                var stream = new MediaStream();
                peer.getSenders().forEach(function(sender) {
                    stream.addTrack(sender.track);
                });
                return [stream];
            };
        }

        peer.onicecandidate = function(event) {
            if (!event.candidate) {
                if (!connection.trickleIce) {
                    var localSdp = peer.localDescription;
                    config.onLocalSdp({
                        type: localSdp.type,
                        sdp: localSdp.sdp,
                        remotePeerSdpConstraints: config.remotePeerSdpConstraints || false,
                        renegotiatingPeer: !!config.renegotiatingPeer || false,
                        connectionDescription: self.connectionDescription,
                        dontGetRemoteStream: !!config.dontGetRemoteStream,
                        extra: connection ? connection.extra : {},
                        streamsToShare: streamsToShare
                    });
                }
                return;
            }

            if (!connection.trickleIce) return;
            config.onLocalCandidate({
                candidate: event.candidate.candidate,
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex
            });
        };

        localStreams.forEach(function(localStream) {
            if (config.remoteSdp && config.remoteSdp.remotePeerSdpConstraints && config.remoteSdp.remotePeerSdpConstraints.dontGetRemoteStream) {
                return;
            }

            if (config.dontAttachLocalStream) {
                return;
            }

            localStream = connection.beforeAddingStream(localStream, self);

            if (!localStream) return;

            peer.getLocalStreams().forEach(function(stream) {
                if (localStream && stream.id == localStream.id) {
                    localStream = null;
                }
            });

            if (localStream && localStream.getTracks) {
                localStream.getTracks().forEach(function(track) {
                    try {
                        // last parameter is redundant for unified-plan
                        // starting from chrome version 72
                        peer.addTrack(track, localStream);
                    } catch (e) {}
                });
            }
        });

        peer.oniceconnectionstatechange = peer.onsignalingstatechange = function() {
            var extra = self.extra;
            if (connection.peers[self.userid]) {
                extra = connection.peers[self.userid].extra || extra;
            }

            if (!peer) {
                return;
            }

            config.onPeerStateChanged({
                iceConnectionState: peer.iceConnectionState,
                iceGatheringState: peer.iceGatheringState,
                signalingState: peer.signalingState,
                extra: extra,
                userid: self.userid
            });

            if (peer && peer.iceConnectionState && peer.iceConnectionState.search(/closed|failed/gi) !== -1 && self.streams instanceof Array) {
                self.streams.forEach(function(stream) {
                    var streamEvent = connection.streamEvents[stream.id] || {
                        streamid: stream.id,
                        stream: stream,
                        type: 'remote'
                    };

                    connection.onstreamended(streamEvent);
                });
            }
        };

        var sdpConstraints = {
            OfferToReceiveAudio: !!localStreams.length,
            OfferToReceiveVideo: !!localStreams.length
        };

        if (config.localPeerSdpConstraints) sdpConstraints = config.localPeerSdpConstraints;

        defaults.sdpConstraints = setSdpConstraints(sdpConstraints);

        var streamObject;
        var dontDuplicate = {};

        peer.ontrack = function(event) {
            if (!event || event.type !== 'track') return;

            event.stream = event.streams[event.streams.length - 1];

            if (!event.stream.id) {
                event.stream.id = event.track.id;
            }

            if (dontDuplicate[event.stream.id] && DetectRTC.browser.name !== 'Safari') {
                if (event.track) {
                    event.track.onended = function() { // event.track.onmute = 
                        peer && peer.onremovestream(event);
                    };
                }
                return;
            }

            dontDuplicate[event.stream.id] = event.stream.id;

            var streamsToShare = {};
            if (config.remoteSdp && config.remoteSdp.streamsToShare) {
                streamsToShare = config.remoteSdp.streamsToShare;
            } else if (config.streamsToShare) {
                streamsToShare = config.streamsToShare;
            }

            var streamToShare = streamsToShare[event.stream.id];
            if (streamToShare) {
                event.stream.isAudio = streamToShare.isAudio;
                event.stream.isVideo = streamToShare.isVideo;
                event.stream.isScreen = streamToShare.isScreen;
            } else {
                event.stream.isVideo = !!getTracks(event.stream, 'video').length;
                event.stream.isAudio = !event.stream.isVideo;
                event.stream.isScreen = false;
            }

            event.stream.streamid = event.stream.id;

            allRemoteStreams[event.stream.id] = event.stream;
            config.onRemoteStream(event.stream);

            event.stream.getTracks().forEach(function(track) {
                track.onended = function() { // track.onmute = 
                    peer && peer.onremovestream(event);
                };
            });

            event.stream.onremovetrack = function() {
                peer && peer.onremovestream(event);
            };
        };

        peer.onremovestream = function(event) {
            // this event doesn't works anymore
            event.stream.streamid = event.stream.id;

            if (allRemoteStreams[event.stream.id]) {
                delete allRemoteStreams[event.stream.id];
            }

            config.onRemoteStreamRemoved(event.stream);
        };

        if (typeof peer.removeStream !== 'function') {
            // removeStream backward compatibility
            peer.removeStream = function(stream) {
                stream.getTracks().forEach(function(track) {
                    peer.removeTrack(track, stream);
                });
            };
        }

        this.addRemoteCandidate = function(remoteCandidate) {
            peer.addIceCandidate(new RTCIceCandidate(remoteCandidate));
        };

        function oldAddRemoteSdp(remoteSdp, cb) {
            cb = cb || function() {};

            if (DetectRTC.browser.name !== 'Safari') {
                remoteSdp.sdp = connection.processSdp(remoteSdp.sdp);
            }
            peer.setRemoteDescription(new RTCSessionDescription(remoteSdp), cb, function(error) {
                if (!!connection.enableLogs) {
                    console.error('setRemoteDescription failed', '\n', error, '\n', remoteSdp.sdp);
                }

                cb();
            });
        }

        this.addRemoteSdp = function(remoteSdp, cb) {
            cb = cb || function() {};

            if (DetectRTC.browser.name !== 'Safari') {
                remoteSdp.sdp = connection.processSdp(remoteSdp.sdp);
            }

            peer.setRemoteDescription(new RTCSessionDescription(remoteSdp)).then(cb, function(error) {
                if (!!connection.enableLogs) {
                    console.error('setRemoteDescription failed', '\n', error, '\n', remoteSdp.sdp);
                }

                cb();
            }).catch(function(error) {
                if (!!connection.enableLogs) {
                    console.error('setRemoteDescription failed', '\n', error, '\n', remoteSdp.sdp);
                }

                cb();
            });
        };

        var isOfferer = true;

        if (config.remoteSdp) {
            isOfferer = false;
        }

        this.createDataChannel = function() {
            var channel = peer.createDataChannel('sctp', {});
            setChannelEvents(channel);
        };

        if (connection.session.data === true && !renegotiatingPeer) {
            if (!isOfferer) {
                peer.ondatachannel = function(event) {
                    var channel = event.channel;
                    setChannelEvents(channel);
                };
            } else {
                this.createDataChannel();
            }
        }

        this.enableDisableVideoEncoding = function(enable) {
            var rtcp;
            peer.getSenders().forEach(function(sender) {
                if (!rtcp && sender.track.kind === 'video') {
                    rtcp = sender;
                }
            });

            if (!rtcp || !rtcp.getParameters) return;

            var parameters = rtcp.getParameters();
            parameters.encodings[1] && (parameters.encodings[1].active = !!enable);
            parameters.encodings[2] && (parameters.encodings[2].active = !!enable);
            rtcp.setParameters(parameters);
        };

        if (config.remoteSdp) {
            if (config.remoteSdp.remotePeerSdpConstraints) {
                sdpConstraints = config.remoteSdp.remotePeerSdpConstraints;
            }
            defaults.sdpConstraints = setSdpConstraints(sdpConstraints);
            this.addRemoteSdp(config.remoteSdp, function() {
                createOfferOrAnswer('createAnswer');
            });
        }

        function setChannelEvents(channel) {
            // force ArrayBuffer in Firefox; which uses "Blob" by default.
            channel.binaryType = 'arraybuffer';

            channel.onmessage = function(event) {
                config.onDataChannelMessage(event.data);
            };

            channel.onopen = function() {
                config.onDataChannelOpened(channel);
            };

            channel.onerror = function(error) {
                config.onDataChannelError(error);
            };

            channel.onclose = function(event) {
                config.onDataChannelClosed(event);
            };

            channel.internalSend = channel.send;
            channel.send = function(data) {
                if (channel.readyState !== 'open') {
                    return;
                }

                channel.internalSend(data);
            };

            peer.channel = channel;
        }

        if (connection.session.audio == 'two-way' || connection.session.video == 'two-way' || connection.session.screen == 'two-way') {
            defaults.sdpConstraints = setSdpConstraints({
                OfferToReceiveAudio: connection.session.audio == 'two-way' || (config.remoteSdp && config.remoteSdp.remotePeerSdpConstraints && config.remoteSdp.remotePeerSdpConstraints.OfferToReceiveAudio),
                OfferToReceiveVideo: connection.session.video == 'two-way' || connection.session.screen == 'two-way' || (config.remoteSdp && config.remoteSdp.remotePeerSdpConstraints && config.remoteSdp.remotePeerSdpConstraints.OfferToReceiveAudio)
            });
        }

        var streamsToShare = {};
        peer.getLocalStreams().forEach(function(stream) {
            streamsToShare[stream.streamid] = {
                isAudio: !!stream.isAudio,
                isVideo: !!stream.isVideo,
                isScreen: !!stream.isScreen
            };
        });

        function oldCreateOfferOrAnswer(_method) {
            peer[_method](function(localSdp) {
                if (DetectRTC.browser.name !== 'Safari') {
                    localSdp.sdp = connection.processSdp(localSdp.sdp);
                }
                peer.setLocalDescription(localSdp, function() {
                    if (!connection.trickleIce) return;

                    config.onLocalSdp({
                        type: localSdp.type,
                        sdp: localSdp.sdp,
                        remotePeerSdpConstraints: config.remotePeerSdpConstraints || false,
                        renegotiatingPeer: !!config.renegotiatingPeer || false,
                        connectionDescription: self.connectionDescription,
                        dontGetRemoteStream: !!config.dontGetRemoteStream,
                        extra: connection ? connection.extra : {},
                        streamsToShare: streamsToShare
                    });

                    connection.onSettingLocalDescription(self);
                }, function(error) {
                    if (!!connection.enableLogs) {
                        console.error('setLocalDescription-error', error);
                    }
                });
            }, function(error) {
                if (!!connection.enableLogs) {
                    console.error('sdp-' + _method + '-error', error);
                }
            }, defaults.sdpConstraints);
        }

        function createOfferOrAnswer(_method) {
            peer[_method](defaults.sdpConstraints).then(function(localSdp) {
                if (DetectRTC.browser.name !== 'Safari') {
                    localSdp.sdp = connection.processSdp(localSdp.sdp);
                }
                peer.setLocalDescription(localSdp).then(function() {
                    if (!connection.trickleIce) return;

                    config.onLocalSdp({
                        type: localSdp.type,
                        sdp: localSdp.sdp,
                        remotePeerSdpConstraints: config.remotePeerSdpConstraints || false,
                        renegotiatingPeer: !!config.renegotiatingPeer || false,
                        connectionDescription: self.connectionDescription,
                        dontGetRemoteStream: !!config.dontGetRemoteStream,
                        extra: connection ? connection.extra : {},
                        streamsToShare: streamsToShare
                    });

                    connection.onSettingLocalDescription(self);
                }, function(error) {
                    if (!connection.enableLogs) return;
                    console.error('setLocalDescription error', error);
                });
            }, function(error) {
                if (!!connection.enableLogs) {
                    console.error('sdp-error', error);
                }
            });
        }

        if (isOfferer) {
            createOfferOrAnswer('createOffer');
        }

        peer.nativeClose = peer.close;
        peer.close = function() {
            if (!peer) {
                return;
            }

            try {
                if (peer.nativeClose !== peer.close) {
                    peer.nativeClose();
                }
            } catch (e) {}

            peer = null;
            self.peer = null;
        };

        this.peer = peer;
    }

    // CodecsHandler.js

    var CodecsHandler = (function() {
        // use "RTCRtpTransceiver.setCodecPreferences"
        function preferCodec(sdp, codecName) {
            var info = splitLines(sdp);

            if (!info.videoCodecNumbers) {
                return sdp;
            }

            if (codecName === 'vp8' && info.vp8LineNumber === info.videoCodecNumbers[0]) {
                return sdp;
            }

            if (codecName === 'vp9' && info.vp9LineNumber === info.videoCodecNumbers[0]) {
                return sdp;
            }

            if (codecName === 'h264' && info.h264LineNumber === info.videoCodecNumbers[0]) {
                return sdp;
            }

            sdp = preferCodecHelper(sdp, codecName, info);

            return sdp;
        }

        function preferCodecHelper(sdp, codec, info, ignore) {
            var preferCodecNumber = '';

            if (codec === 'vp8') {
                if (!info.vp8LineNumber) {
                    return sdp;
                }
                preferCodecNumber = info.vp8LineNumber;
            }

            if (codec === 'vp9') {
                if (!info.vp9LineNumber) {
                    return sdp;
                }
                preferCodecNumber = info.vp9LineNumber;
            }

            if (codec === 'h264') {
                if (!info.h264LineNumber) {
                    return sdp;
                }

                preferCodecNumber = info.h264LineNumber;
            }

            var newLine = info.videoCodecNumbersOriginal.split('SAVPF')[0] + 'SAVPF ';

            var newOrder = [preferCodecNumber];

            if (ignore) {
                newOrder = [];
            }

            info.videoCodecNumbers.forEach(function(codecNumber) {
                if (codecNumber === preferCodecNumber) return;
                newOrder.push(codecNumber);
            });

            newLine += newOrder.join(' ');

            sdp = sdp.replace(info.videoCodecNumbersOriginal, newLine);
            return sdp;
        }

        function splitLines(sdp) {
            var info = {};
            sdp.split('\n').forEach(function(line) {
                if (line.indexOf('m=video') === 0) {
                    info.videoCodecNumbers = [];
                    line.split('SAVPF')[1].split(' ').forEach(function(codecNumber) {
                        codecNumber = codecNumber.trim();
                        if (!codecNumber || !codecNumber.length) return;
                        info.videoCodecNumbers.push(codecNumber);
                        info.videoCodecNumbersOriginal = line;
                    });
                }

                if (line.indexOf('VP8/90000') !== -1 && !info.vp8LineNumber) {
                    info.vp8LineNumber = line.replace('a=rtpmap:', '').split(' ')[0];
                }

                if (line.indexOf('VP9/90000') !== -1 && !info.vp9LineNumber) {
                    info.vp9LineNumber = line.replace('a=rtpmap:', '').split(' ')[0];
                }

                if (line.indexOf('H264/90000') !== -1 && !info.h264LineNumber) {
                    info.h264LineNumber = line.replace('a=rtpmap:', '').split(' ')[0];
                }
            });

            return info;
        }

        function removeVPX(sdp) {
            var info = splitLines(sdp);

            // last parameter below means: ignore these codecs
            sdp = preferCodecHelper(sdp, 'vp9', info, true);
            sdp = preferCodecHelper(sdp, 'vp8', info, true);

            return sdp;
        }

        function disableNACK(sdp) {
            if (!sdp || typeof sdp !== 'string') {
                throw 'Invalid arguments.';
            }

            sdp = sdp.replace('a=rtcp-fb:126 nack\r\n', '');
            sdp = sdp.replace('a=rtcp-fb:126 nack pli\r\n', 'a=rtcp-fb:126 pli\r\n');
            sdp = sdp.replace('a=rtcp-fb:97 nack\r\n', '');
            sdp = sdp.replace('a=rtcp-fb:97 nack pli\r\n', 'a=rtcp-fb:97 pli\r\n');

            return sdp;
        }

        function prioritize(codecMimeType, peer) {
            if (!peer || !peer.getSenders || !peer.getSenders().length) {
                return;
            }

            if (!codecMimeType || typeof codecMimeType !== 'string') {
                throw 'Invalid arguments.';
            }

            peer.getSenders().forEach(function(sender) {
                var params = sender.getParameters();
                for (var i = 0; i < params.codecs.length; i++) {
                    if (params.codecs[i].mimeType == codecMimeType) {
                        params.codecs.unshift(params.codecs.splice(i, 1));
                        break;
                    }
                }
                sender.setParameters(params);
            });
        }

        function removeNonG722(sdp) {
            return sdp.replace(/m=audio ([0-9]+) RTP\/SAVPF ([0-9 ]*)/g, 'm=audio $1 RTP\/SAVPF 9');
        }

        function setBAS(sdp, bandwidth, isScreen) {
            if (!bandwidth) {
                return sdp;
            }

            if (typeof isFirefox !== 'undefined' && isFirefox) {
                return sdp;
            }

            if (isScreen) {
                if (!bandwidth.screen) {
                    console.warn('It seems that you are not using bandwidth for screen. Screen sharing is expected to fail.');
                } else if (bandwidth.screen < 300) {
                    console.warn('It seems that you are using wrong bandwidth value for screen. Screen sharing is expected to fail.');
                }
            }

            // if screen; must use at least 300kbs
            if (bandwidth.screen && isScreen) {
                sdp = sdp.replace(/b=AS([^\r\n]+\r\n)/g, '');
                sdp = sdp.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:' + bandwidth.screen + '\r\n');
            }

            // remove existing bandwidth lines
            if (bandwidth.audio || bandwidth.video) {
                sdp = sdp.replace(/b=AS([^\r\n]+\r\n)/g, '');
            }

            if (bandwidth.audio) {
                sdp = sdp.replace(/a=mid:audio\r\n/g, 'a=mid:audio\r\nb=AS:' + bandwidth.audio + '\r\n');
            }

            if (bandwidth.screen) {
                sdp = sdp.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:' + bandwidth.screen + '\r\n');
            } else if (bandwidth.video) {
                sdp = sdp.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:' + bandwidth.video + '\r\n');
            }

            return sdp;
        }

        // Find the line in sdpLines that starts with |prefix|, and, if specified,
        // contains |substr| (case-insensitive search).
        function findLine(sdpLines, prefix, substr) {
            return findLineInRange(sdpLines, 0, -1, prefix, substr);
        }

        // Find the line in sdpLines[startLine...endLine - 1] that starts with |prefix|
        // and, if specified, contains |substr| (case-insensitive search).
        function findLineInRange(sdpLines, startLine, endLine, prefix, substr) {
            var realEndLine = endLine !== -1 ? endLine : sdpLines.length;
            for (var i = startLine; i < realEndLine; ++i) {
                if (sdpLines[i].indexOf(prefix) === 0) {
                    if (!substr ||
                        sdpLines[i].toLowerCase().indexOf(substr.toLowerCase()) !== -1) {
                        return i;
                    }
                }
            }
            return null;
        }

        // Gets the codec payload type from an a=rtpmap:X line.
        function getCodecPayloadType(sdpLine) {
            var pattern = new RegExp('a=rtpmap:(\\d+) \\w+\\/\\d+');
            var result = sdpLine.match(pattern);
            return (result && result.length === 2) ? result[1] : null;
        }

        function setVideoBitrates(sdp, params) {
            params = params || {};
            var xgoogle_min_bitrate = params.min;
            var xgoogle_max_bitrate = params.max;

            var sdpLines = sdp.split('\r\n');

            // VP8
            var vp8Index = findLine(sdpLines, 'a=rtpmap', 'VP8/90000');
            var vp8Payload;
            if (vp8Index) {
                vp8Payload = getCodecPayloadType(sdpLines[vp8Index]);
            }

            if (!vp8Payload) {
                return sdp;
            }

            var rtxIndex = findLine(sdpLines, 'a=rtpmap', 'rtx/90000');
            var rtxPayload;
            if (rtxIndex) {
                rtxPayload = getCodecPayloadType(sdpLines[rtxIndex]);
            }

            if (!rtxIndex) {
                return sdp;
            }

            var rtxFmtpLineIndex = findLine(sdpLines, 'a=fmtp:' + rtxPayload.toString());
            if (rtxFmtpLineIndex !== null) {
                var appendrtxNext = '\r\n';
                appendrtxNext += 'a=fmtp:' + vp8Payload + ' x-google-min-bitrate=' + (xgoogle_min_bitrate || '228') + '; x-google-max-bitrate=' + (xgoogle_max_bitrate || '228');
                sdpLines[rtxFmtpLineIndex] = sdpLines[rtxFmtpLineIndex].concat(appendrtxNext);
                sdp = sdpLines.join('\r\n');
            }

            return sdp;
        }

        function setOpusAttributes(sdp, params) {
            params = params || {};

            var sdpLines = sdp.split('\r\n');

            // Opus
            var opusIndex = findLine(sdpLines, 'a=rtpmap', 'opus/48000');
            var opusPayload;
            if (opusIndex) {
                opusPayload = getCodecPayloadType(sdpLines[opusIndex]);
            }

            if (!opusPayload) {
                return sdp;
            }

            var opusFmtpLineIndex = findLine(sdpLines, 'a=fmtp:' + opusPayload.toString());
            if (opusFmtpLineIndex === null) {
                return sdp;
            }

            var appendOpusNext = '';
            appendOpusNext += '; stereo=' + (typeof params.stereo != 'undefined' ? params.stereo : '1');
            appendOpusNext += '; sprop-stereo=' + (typeof params['sprop-stereo'] != 'undefined' ? params['sprop-stereo'] : '1');

            if (typeof params.maxaveragebitrate != 'undefined') {
                appendOpusNext += '; maxaveragebitrate=' + (params.maxaveragebitrate || 128 * 1024 * 8);
            }

            if (typeof params.maxplaybackrate != 'undefined') {
                appendOpusNext += '; maxplaybackrate=' + (params.maxplaybackrate || 128 * 1024 * 8);
            }

            if (typeof params.cbr != 'undefined') {
                appendOpusNext += '; cbr=' + (typeof params.cbr != 'undefined' ? params.cbr : '1');
            }

            if (typeof params.useinbandfec != 'undefined') {
                appendOpusNext += '; useinbandfec=' + params.useinbandfec;
            }

            if (typeof params.usedtx != 'undefined') {
                appendOpusNext += '; usedtx=' + params.usedtx;
            }

            if (typeof params.maxptime != 'undefined') {
                appendOpusNext += '\r\na=maxptime:' + params.maxptime;
            }

            sdpLines[opusFmtpLineIndex] = sdpLines[opusFmtpLineIndex].concat(appendOpusNext);

            sdp = sdpLines.join('\r\n');
            return sdp;
        }

        // forceStereoAudio => via webrtcexample.com
        // requires getUserMedia => echoCancellation:false
        function forceStereoAudio(sdp) {
            var sdpLines = sdp.split('\r\n');
            var fmtpLineIndex = null;
            for (var i = 0; i < sdpLines.length; i++) {
                if (sdpLines[i].search('opus/48000') !== -1) {
                    var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
                    break;
                }
            }
            for (var i = 0; i < sdpLines.length; i++) {
                if (sdpLines[i].search('a=fmtp') !== -1) {
                    var payload = extractSdp(sdpLines[i], /a=fmtp:(\d+)/);
                    if (payload === opusPayload) {
                        fmtpLineIndex = i;
                        break;
                    }
                }
            }
            if (fmtpLineIndex === null) return sdp;
            sdpLines[fmtpLineIndex] = sdpLines[fmtpLineIndex].concat('; stereo=1; sprop-stereo=1');
            sdp = sdpLines.join('\r\n');
            return sdp;
        }

        return {
            removeVPX: removeVPX,
            disableNACK: disableNACK,
            prioritize: prioritize,
            removeNonG722: removeNonG722,
            setApplicationSpecificBandwidth: function(sdp, bandwidth, isScreen) {
                return setBAS(sdp, bandwidth, isScreen);
            },
            setVideoBitrates: function(sdp, params) {
                return setVideoBitrates(sdp, params);
            },
            setOpusAttributes: function(sdp, params) {
                return setOpusAttributes(sdp, params);
            },
            preferVP9: function(sdp) {
                return preferCodec(sdp, 'vp9');
            },
            preferCodec: preferCodec,
            forceStereoAudio: forceStereoAudio
        };
    })();

    // backward compatibility
    window.BandwidthHandler = CodecsHandler;

    // OnIceCandidateHandler.js

    var OnIceCandidateHandler = (function() {
        function processCandidates(connection, icePair) {
            var candidate = icePair.candidate;

            var iceRestrictions = connection.candidates;
            var stun = iceRestrictions.stun;
            var turn = iceRestrictions.turn;

            if (!isNull(iceRestrictions.reflexive)) {
                stun = iceRestrictions.reflexive;
            }

            if (!isNull(iceRestrictions.relay)) {
                turn = iceRestrictions.relay;
            }

            if (!iceRestrictions.host && !!candidate.match(/typ host/g)) {
                return;
            }

            if (!turn && !!candidate.match(/typ relay/g)) {
                return;
            }

            if (!stun && !!candidate.match(/typ srflx/g)) {
                return;
            }

            var protocol = connection.iceProtocols;

            if (!protocol.udp && !!candidate.match(/ udp /g)) {
                return;
            }

            if (!protocol.tcp && !!candidate.match(/ tcp /g)) {
                return;
            }

            if (connection.enableLogs) {
                console.debug('Your candidate pairs:', candidate);
            }

            return {
                candidate: candidate,
                sdpMid: icePair.sdpMid,
                sdpMLineIndex: icePair.sdpMLineIndex
            };
        }

        return {
            processCandidates: processCandidates
        };
    })();

    // IceServersHandler.js

    var IceServersHandler = (function() {
        function getIceServers(connection) {
            // resiprocate: 3344+4433
            // pions: 7575
            var iceServers = [{
                'urls': [
                    'stun:stun.l.google.com:19302',
                    'stun:stun1.l.google.com:19302',
                    'stun:stun2.l.google.com:19302',
                    'stun:stun.l.google.com:19302?transport=udp',
                ]
            }];

            return iceServers;
        }

        return {
            getIceServers: getIceServers
        };
    })();

    // getUserMediaHandler.js

    function setStreamType(constraints, stream) {
        if (constraints.mandatory && constraints.mandatory.chromeMediaSource) {
            stream.isScreen = true;
        } else if (constraints.mozMediaSource || constraints.mediaSource) {
            stream.isScreen = true;
        } else if (constraints.video) {
            stream.isVideo = true;
        } else if (constraints.audio) {
            stream.isAudio = true;
        }
    }

    // allow users to manage this object (to support re-capturing of screen/etc.)
    window.currentUserMediaRequest = {
        streams: [],
        mutex: false,
        queueRequests: [],
        remove: function(idInstance) {
            this.mutex = false;

            var stream = this.streams[idInstance];
            if (!stream) {
                return;
            }

            stream = stream.stream;

            var options = stream.currentUserMediaRequestOptions;

            if (this.queueRequests.indexOf(options)) {
                delete this.queueRequests[this.queueRequests.indexOf(options)];
                this.queueRequests = removeNullEntries(this.queueRequests);
            }

            this.streams[idInstance].stream = null;
            delete this.streams[idInstance];
        }
    };

    function getUserMediaHandler(options) {
        if (currentUserMediaRequest.mutex === true) {
            currentUserMediaRequest.queueRequests.push(options);
            return;
        }
        currentUserMediaRequest.mutex = true;

        // easy way to match
        var idInstance = JSON.stringify(options.localMediaConstraints);

        function streaming(stream, returnBack) {
            setStreamType(options.localMediaConstraints, stream);

            var streamEndedEvent = 'ended';

            if ('oninactive' in stream) {
                streamEndedEvent = 'inactive';
            }
            stream.addEventListener(streamEndedEvent, function() {
                delete currentUserMediaRequest.streams[idInstance];

                currentUserMediaRequest.mutex = false;
                if (currentUserMediaRequest.queueRequests.indexOf(options)) {
                    delete currentUserMediaRequest.queueRequests[currentUserMediaRequest.queueRequests.indexOf(options)];
                    currentUserMediaRequest.queueRequests = removeNullEntries(currentUserMediaRequest.queueRequests);
                }
            }, false);

            currentUserMediaRequest.streams[idInstance] = {
                stream: stream
            };
            currentUserMediaRequest.mutex = false;

            if (currentUserMediaRequest.queueRequests.length) {
                getUserMediaHandler(currentUserMediaRequest.queueRequests.shift());
            }

            // callback
            options.onGettingLocalMedia(stream, returnBack);
        }

        if (currentUserMediaRequest.streams[idInstance]) {
            streaming(currentUserMediaRequest.streams[idInstance].stream, true);
        } else {
            var isBlackBerry = !!(/BB10|BlackBerry/i.test(navigator.userAgent || ''));
            if (isBlackBerry || typeof navigator.mediaDevices === 'undefined' || typeof navigator.mediaDevices.getUserMedia !== 'function') {
                navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
                navigator.getUserMedia(options.localMediaConstraints, function(stream) {
                    stream.streamid = stream.streamid || stream.id || getRandomString();
                    stream.idInstance = idInstance;
                    streaming(stream);
                }, function(error) {
                    options.onLocalMediaError(error, options.localMediaConstraints);
                });
                return;
            }

            if (typeof navigator.mediaDevices === 'undefined') {
                navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
                var getUserMediaSuccess = function() {};
                var getUserMediaFailure = function() {};

                var getUserMediaStream, getUserMediaError;
                navigator.mediaDevices = {
                    getUserMedia: function(hints) {
                        navigator.getUserMedia(hints, function(getUserMediaSuccess) {
                            getUserMediaSuccess(stream);
                            getUserMediaStream = stream;
                        }, function(error) {
                            getUserMediaFailure(error);
                            getUserMediaError = error;
                        });

                        return {
                            then: function(successCB) {
                                if (getUserMediaStream) {
                                    successCB(getUserMediaStream);
                                    return;
                                }

                                getUserMediaSuccess = successCB;

                                return {
                                    then: function(failureCB) {
                                        if (getUserMediaError) {
                                            failureCB(getUserMediaError);
                                            return;
                                        }

                                        getUserMediaFailure = failureCB;
                                    }
                                }
                            }
                        }
                    }
                };
            }

            if (options.localMediaConstraints.isScreen === true) {
                if (navigator.mediaDevices.getDisplayMedia) {
                    navigator.mediaDevices.getDisplayMedia(options.localMediaConstraints).then(function(stream) {
                        stream.streamid = stream.streamid || stream.id || getRandomString();
                        stream.idInstance = idInstance;

                        streaming(stream);
                    }).catch(function(error) {
                        options.onLocalMediaError(error, options.localMediaConstraints);
                    });
                } else if (navigator.getDisplayMedia) {
                    navigator.getDisplayMedia(options.localMediaConstraints).then(function(stream) {
                        stream.streamid = stream.streamid || stream.id || getRandomString();
                        stream.idInstance = idInstance;

                        streaming(stream);
                    }).catch(function(error) {
                        options.onLocalMediaError(error, options.localMediaConstraints);
                    });
                } else {
                    throw new Error('getDisplayMedia API is not availabe in this browser.');
                }
                return;
            }

            navigator.mediaDevices.getUserMedia(options.localMediaConstraints).then(function(stream) {
                stream.streamid = stream.streamid || stream.id || getRandomString();
                stream.idInstance = idInstance;

                streaming(stream);
            }).catch(function(error) {
                options.onLocalMediaError(error, options.localMediaConstraints);
            });
        }
    }

    // StreamsHandler.js

    var StreamsHandler = (function() {
        function handleType(type) {
            if (!type) {
                return;
            }

            if (typeof type === 'string' || typeof type === 'undefined') {
                return type;
            }

            if (type.audio && type.video) {
                return null;
            }

            if (type.audio) {
                return 'audio';
            }

            if (type.video) {
                return 'video';
            }

            return;
        }

        function setHandlers(stream, syncAction, connection) {
            if (!stream || !stream.addEventListener) return;

            if (typeof syncAction == 'undefined' || syncAction == true) {
                var streamEndedEvent = 'ended';

                if ('oninactive' in stream) {
                    streamEndedEvent = 'inactive';
                }

                stream.addEventListener(streamEndedEvent, function() {
                    StreamsHandler.onSyncNeeded(this.streamid, streamEndedEvent);
                }, false);
            }

            stream.mute = function(type, isSyncAction) {
                type = handleType(type);

                if (typeof isSyncAction !== 'undefined') {
                    syncAction = isSyncAction;
                }

                if (typeof type == 'undefined' || type == 'audio') {
                    getTracks(stream, 'audio').forEach(function(track) {
                        track.enabled = false;
                        connection.streamEvents[stream.streamid].isAudioMuted = true;
                    });
                }

                if (typeof type == 'undefined' || type == 'video') {
                    getTracks(stream, 'video').forEach(function(track) {
                        track.enabled = false;
                    });
                }

                if (typeof syncAction == 'undefined' || syncAction == true) {
                    StreamsHandler.onSyncNeeded(stream.streamid, 'mute', type);
                }

                connection.streamEvents[stream.streamid].muteType = type || 'both';

                fireEvent(stream, 'mute', type);
            };

            stream.unmute = function(type, isSyncAction) {
                type = handleType(type);

                if (typeof isSyncAction !== 'undefined') {
                    syncAction = isSyncAction;
                }

                graduallyIncreaseVolume();

                if (typeof type == 'undefined' || type == 'audio') {
                    getTracks(stream, 'audio').forEach(function(track) {
                        track.enabled = true;
                        connection.streamEvents[stream.streamid].isAudioMuted = false;
                    });
                }

                if (typeof type == 'undefined' || type == 'video') {
                    getTracks(stream, 'video').forEach(function(track) {
                        track.enabled = true;
                    });

                    // make sure that video unmute doesn't affects audio
                    if (typeof type !== 'undefined' && type == 'video' && connection.streamEvents[stream.streamid].isAudioMuted) {
                        (function looper(times) {
                            if (!times) {
                                times = 0;
                            }

                            times++;

                            // check until five-seconds
                            if (times < 100 && connection.streamEvents[stream.streamid].isAudioMuted) {
                                stream.mute('audio');

                                setTimeout(function() {
                                    looper(times);
                                }, 50);
                            }
                        })();
                    }
                }

                if (typeof syncAction == 'undefined' || syncAction == true) {
                    StreamsHandler.onSyncNeeded(stream.streamid, 'unmute', type);
                }

                connection.streamEvents[stream.streamid].unmuteType = type || 'both';

                fireEvent(stream, 'unmute', type);
            };

            function graduallyIncreaseVolume() {
                if (!connection.streamEvents[stream.streamid].mediaElement) {
                    return;
                }

                var mediaElement = connection.streamEvents[stream.streamid].mediaElement;
                mediaElement.volume = 0;
                afterEach(200, 5, function() {
                    try {
                        mediaElement.volume += .20;
                    } catch (e) {
                        mediaElement.volume = 1;
                    }
                });
            }
        }

        function afterEach(setTimeoutInteval, numberOfTimes, callback, startedTimes) {
            startedTimes = (startedTimes || 0) + 1;
            if (startedTimes >= numberOfTimes) return;

            setTimeout(function() {
                callback();
                afterEach(setTimeoutInteval, numberOfTimes, callback, startedTimes);
            }, setTimeoutInteval);
        }

        return {
            setHandlers: setHandlers,
            onSyncNeeded: function(streamid, action, type) {}
        };
    })();

    // TextReceiver.js & TextSender.js

    function TextReceiver(connection) {
        var content = {};

        function receive(data, userid, extra) {
            // uuid is used to uniquely identify sending instance
            var uuid = data.uuid;
            if (!content[uuid]) {
                content[uuid] = [];
            }

            content[uuid].push(data.message);

            if (data.last) {
                var message = content[uuid].join('');
                if (data.isobject) {
                    message = JSON.parse(message);
                }

                // latency detection
                var receivingTime = new Date().getTime();
                var latency = receivingTime - data.sendingTime;

                var e = {
                    data: message,
                    userid: userid,
                    extra: extra,
                    latency: latency
                };

                if (connection.autoTranslateText) {
                    e.original = e.data;
                    connection.Translator.TranslateText(e.data, function(translatedText) {
                        e.data = translatedText;
                        connection.onmessage(e);
                    });
                } else {
                    connection.onmessage(e);
                }

                delete content[uuid];
            }
        }

        return {
            receive: receive
        };
    }

    // TextSender.js
    var TextSender = {
        send: function(config) {
            var connection = config.connection;

            var channel = config.channel,
                remoteUserId = config.remoteUserId,
                initialText = config.text,
                packetSize = connection.chunkSize || 1000,
                textToTransfer = '',
                isobject = false;

            if (!isString(initialText)) {
                isobject = true;
                initialText = JSON.stringify(initialText);
            }

            // uuid is used to uniquely identify sending instance
            var uuid = getRandomString();
            var sendingTime = new Date().getTime();

            sendText(initialText);

            function sendText(textMessage, text) {
                var data = {
                    type: 'text',
                    uuid: uuid,
                    sendingTime: sendingTime
                };

                if (textMessage) {
                    text = textMessage;
                    data.packets = parseInt(text.length / packetSize);
                }

                if (text.length > packetSize) {
                    data.message = text.slice(0, packetSize);
                } else {
                    data.message = text;
                    data.last = true;
                    data.isobject = isobject;
                }

                channel.send(data, remoteUserId);

                textToTransfer = text.slice(data.message.length);

                if (textToTransfer.length) {
                    setTimeout(function() {
                        sendText(null, textToTransfer);
                    }, connection.chunkInterval || 100);
                }
            }
        }
    };

    // FileProgressBarHandler.js

    var FileProgressBarHandler = (function() {
        function handle(connection) {
            var progressHelper = {};

            // www.RTCMultiConnection.org/docs/onFileStart/
            connection.onFileStart = function(file) {
                var div = document.createElement('div');
                div.title = file.name;
                div.innerHTML = '<label>0%</label> <progress></progress>';

                if (file.remoteUserId) {
                    div.innerHTML += ' (Sharing with:' + file.remoteUserId + ')';
                }

                if (!connection.filesContainer) {
                    connection.filesContainer = document.body || document.documentElement;
                }

                connection.filesContainer.insertBefore(div, connection.filesContainer.firstChild);

                if (!file.remoteUserId) {
                    progressHelper[file.uuid] = {
                        div: div,
                        progress: div.querySelector('progress'),
                        label: div.querySelector('label')
                    };
                    progressHelper[file.uuid].progress.max = file.maxChunks;
                    return;
                }

                if (!progressHelper[file.uuid]) {
                    progressHelper[file.uuid] = {};
                }

                progressHelper[file.uuid][file.remoteUserId] = {
                    div: div,
                    progress: div.querySelector('progress'),
                    label: div.querySelector('label')
                };
                progressHelper[file.uuid][file.remoteUserId].progress.max = file.maxChunks;
            };

            // www.RTCMultiConnection.org/docs/onFileProgress/
            connection.onFileProgress = function(chunk) {
                var helper = progressHelper[chunk.uuid];
                if (!helper) {
                    return;
                }
                if (chunk.remoteUserId) {
                    helper = progressHelper[chunk.uuid][chunk.remoteUserId];
                    if (!helper) {
                        return;
                    }
                }

                helper.progress.value = chunk.currentPosition || chunk.maxChunks || helper.progress.max;
                updateLabel(helper.progress, helper.label);
            };

            // www.RTCMultiConnection.org/docs/onFileEnd/
            connection.onFileEnd = function(file) {
                var helper = progressHelper[file.uuid];
                if (!helper) {
                    console.error('No such progress-helper element exist.', file);
                    return;
                }

                if (file.remoteUserId) {
                    helper = progressHelper[file.uuid][file.remoteUserId];
                    if (!helper) {
                        return;
                    }
                }

                var div = helper.div;
                if (file.type.indexOf('image') != -1) {
                    div.innerHTML = '<a href="' + file.url + '" download="' + file.name + '">Download <strong style="color:red;">' + file.name + '</strong> </a><br /><img src="' + file.url + '" title="' + file.name + '" style="max-width: 80%;">';
                } else {
                    div.innerHTML = '<a href="' + file.url + '" download="' + file.name + '">Download <strong style="color:red;">' + file.name + '</strong> </a><br /><iframe src="' + file.url + '" title="' + file.name + '" style="width: 80%;border: 0;height: inherit;margin-top:1em;"></iframe>';
                }
            };

            function updateLabel(progress, label) {
                if (progress.position === -1) {
                    return;
                }

                var position = +progress.position.toFixed(2).split('.')[1] || 100;
                label.innerHTML = position + '%';
            }
        }

        return {
            handle: handle
        };
    })();

    // TranslationHandler.js

    var TranslationHandler = (function() {
        function handle(connection) {
            connection.autoTranslateText = false;
            connection.language = 'en';
            connection.googKey = 'AIzaSyCgB5hmFY74WYB-EoWkhr9cAGr6TiTHrEE';

            // www.RTCMultiConnection.org/docs/Translator/
            connection.Translator = {
                TranslateText: function(text, callback) {
                    // if(location.protocol === 'https:') return callback(text);

                    var newScript = document.createElement('script');
                    newScript.type = 'text/javascript';

                    var sourceText = encodeURIComponent(text); // escape

                    var randomNumber = 'method' + connection.token();
                    window[randomNumber] = function(response) {
                        if (response.data && response.data.translations[0] && callback) {
                            callback(response.data.translations[0].translatedText);
                            return;
                        }

                        if (response.error && response.error.message === 'Daily Limit Exceeded') {
                            console.error('Text translation failed. Error message: "Daily Limit Exceeded."');
                            return;
                        }

                        if (response.error) {
                            console.error(response.error.message);
                            return;
                        }

                        console.error(response);
                    };

                    var source = 'https://www.googleapis.com/language/translate/v2?key=' + connection.googKey + '&target=' + (connection.language || 'en-US') + '&callback=window.' + randomNumber + '&q=' + sourceText;
                    newScript.src = source;
                    document.getElementsByTagName('head')[0].appendChild(newScript);
                },
                getListOfLanguages: function(callback) {
                    var xhr = new XMLHttpRequest();
                    xhr.onreadystatechange = function() {
                        if (xhr.readyState == XMLHttpRequest.DONE) {
                            var response = JSON.parse(xhr.responseText);

                            if (response && response.data && response.data.languages) {
                                callback(response.data.languages);
                                return;
                            }

                            if (response.error && response.error.message === 'Daily Limit Exceeded') {
                                console.error('Text translation failed. Error message: "Daily Limit Exceeded."');
                                return;
                            }

                            if (response.error) {
                                console.error(response.error.message);
                                return;
                            }

                            console.error(response);
                        }
                    }
                    var url = 'https://www.googleapis.com/language/translate/v2/languages?key=' + connection.googKey + '&target=en';
                    xhr.open('GET', url, true);
                    xhr.send(null);
                }
            };
        }

        return {
            handle: handle
        };
    })();

    // _____________________
    // RTCMultiConnection.js

    (function(connection) {
        forceOptions = forceOptions || {
            useDefaultDevices: true
        };

        connection.channel = connection.sessionid = (roomid || location.href.replace(/\/|:|#|\?|\$|\^|%|\.|`|~|!|\+|@|\[|\||]|\|*. /g, '').split('\n').join('').split('\r').join('')) + '';

        var mPeer = new MultiPeers(connection);

        var preventDuplicateOnStreamEvents = {};
        mPeer.onGettingLocalMedia = function(stream, callback) {
            callback = callback || function() {};

            if (preventDuplicateOnStreamEvents[stream.streamid]) {
                callback();
                return;
            }
            preventDuplicateOnStreamEvents[stream.streamid] = true;

            try {
                stream.type = 'local';
            } catch (e) {}

            connection.setStreamEndHandler(stream);

            getRMCMediaElement(stream, function(mediaElement) {
                mediaElement.id = stream.streamid;
                mediaElement.muted = true;
                mediaElement.volume = 0;

                if (connection.attachStreams.indexOf(stream) === -1) {
                    connection.attachStreams.push(stream);
                }

                if (typeof StreamsHandler !== 'undefined') {
                    StreamsHandler.setHandlers(stream, true, connection);
                }
                var isAudioMuted = stream.getAudioTracks().filter(function(track) {
                    return track.enabled;
                }).length === 0;

                connection.streamEvents[stream.streamid] = {
                    stream: stream,
                    type: 'local',
                    mediaElement: mediaElement,
                    userid: connection.userid,
                    extra: connection.extra,
                    streamid: stream.streamid,
                    isAudioMuted: isAudioMuted
                };

                try {
                    setHarkEvents(connection, connection.streamEvents[stream.streamid]);
                    setMuteHandlers(connection, connection.streamEvents[stream.streamid]);

                    connection.onstream(connection.streamEvents[stream.streamid]);
                } catch (e) {
                    //
                }

                callback();
            }, connection);
        };

        mPeer.onGettingRemoteMedia = function(stream, remoteUserId) {
            try {
                stream.type = 'remote';
            } catch (e) {}

            connection.setStreamEndHandler(stream, 'remote-stream');

            getRMCMediaElement(stream, function(mediaElement) {
                mediaElement.id = stream.streamid;

                if (typeof StreamsHandler !== 'undefined') {
                    StreamsHandler.setHandlers(stream, false, connection);
                }

                connection.streamEvents[stream.streamid] = {
                    stream: stream,
                    type: 'remote',
                    userid: remoteUserId,
                    extra: connection.peers[remoteUserId] ? connection.peers[remoteUserId].extra : {},
                    mediaElement: mediaElement,
                    streamid: stream.streamid
                };

                setMuteHandlers(connection, connection.streamEvents[stream.streamid]);

                connection.onstream(connection.streamEvents[stream.streamid]);
            }, connection);
        };

        mPeer.onRemovingRemoteMedia = function(stream, remoteUserId) {
            var streamEvent = connection.streamEvents[stream.streamid];
            if (!streamEvent) {
                streamEvent = {
                    stream: stream,
                    type: 'remote',
                    userid: remoteUserId,
                    extra: connection.peers[remoteUserId] ? connection.peers[remoteUserId].extra : {},
                    streamid: stream.streamid,
                    mediaElement: connection.streamEvents[stream.streamid] ? connection.streamEvents[stream.streamid].mediaElement : null
                };
            }

            if (connection.peersBackup[streamEvent.userid]) {
                streamEvent.extra = connection.peersBackup[streamEvent.userid].extra;
            }

            connection.onstreamended(streamEvent);

            delete connection.streamEvents[stream.streamid];
        };

        mPeer.onNegotiationNeeded = function(message, remoteUserId, callback) {
            callback = callback || function() {};

            remoteUserId = remoteUserId || message.remoteUserId;
            message = message || '';

            // usually a message looks like this
            var messageToDeliver = {
                remoteUserId: remoteUserId,
                message: message,
                sender: connection.userid
            };

            if (message.remoteUserId && message.message && message.sender) {
                // if a code is manually passing required data
                messageToDeliver = message;
            }

            connectSocket(function() {
                connection.socket.emit(connection.socketMessageEvent, messageToDeliver, callback);
            });
        };

        function onUserLeft(remoteUserId) {
            connection.deletePeer(remoteUserId);
        }

        mPeer.onUserLeft = onUserLeft;
        mPeer.disconnectWith = function(remoteUserId, callback) {
            if (connection.socket) {
                connection.socket.emit('disconnect-with', remoteUserId, callback || function() {});
            }

            connection.deletePeer(remoteUserId);
        };

        connection.socketOptions = {
            // 'force new connection': true, // For SocketIO version < 1.0
            // 'forceNew': true, // For SocketIO version >= 1.0
            'transport': 'polling' // fixing transport:unknown issues
        };

        function connectSocket(connectCallback) {
            connection.socketAutoReConnect = true;

            if (connection.socket) { // todo: check here readySate/etc. to make sure socket is still opened
                if (connectCallback) {
                    connectCallback(connection.socket);
                }
                return;
            }

            if (typeof SocketConnection === 'undefined') {
                if (typeof FirebaseConnection !== 'undefined') {
                    window.SocketConnection = FirebaseConnection;
                } else if (typeof PubNubConnection !== 'undefined') {
                    window.SocketConnection = PubNubConnection;
                } else {
                    throw 'SocketConnection.js seems missed.';
                }
            }

            new SocketConnection(connection, function(s) {
                if (connectCallback) {
                    connectCallback(connection.socket);
                }
            });
        }

        // 1st paramter is roomid
        // 2rd paramter is a callback function
        connection.openOrJoin = function(roomid, callback) {
            callback = callback || function() {};

            connection.checkPresence(roomid, function(isRoomExist, roomid) {
                if (isRoomExist) {
                    connection.sessionid = roomid;

                    var localPeerSdpConstraints = false;
                    var remotePeerSdpConstraints = false;
                    var isOneWay = !!connection.session.oneway;
                    var isDataOnly = isData(connection.session);

                    remotePeerSdpConstraints = {
                        OfferToReceiveAudio: connection.sdpConstraints.mandatory.OfferToReceiveAudio,
                        OfferToReceiveVideo: connection.sdpConstraints.mandatory.OfferToReceiveVideo
                    }

                    localPeerSdpConstraints = {
                        OfferToReceiveAudio: isOneWay ? !!connection.session.audio : connection.sdpConstraints.mandatory.OfferToReceiveAudio,
                        OfferToReceiveVideo: isOneWay ? !!connection.session.video || !!connection.session.screen : connection.sdpConstraints.mandatory.OfferToReceiveVideo
                    }

                    var connectionDescription = {
                        remoteUserId: connection.sessionid,
                        message: {
                            newParticipationRequest: true,
                            isOneWay: isOneWay,
                            isDataOnly: isDataOnly,
                            localPeerSdpConstraints: localPeerSdpConstraints,
                            remotePeerSdpConstraints: remotePeerSdpConstraints
                        },
                        sender: connection.userid
                    };

                    beforeJoin(connectionDescription.message, function() {
                        joinRoom(connectionDescription, callback);
                    });
                    return;
                }

                connection.waitingForLocalMedia = true;
                connection.isInitiator = true;

                connection.sessionid = roomid || connection.sessionid;

                if (isData(connection.session)) {
                    openRoom(callback);
                    return;
                }

                connection.captureUserMedia(function() {
                    openRoom(callback);
                });
            });
        };

        // don't allow someone to join this person until he has the media
        connection.waitingForLocalMedia = false;

        connection.open = function(roomid, callback) {
            callback = callback || function() {};

            connection.waitingForLocalMedia = true;
            connection.isInitiator = true;

            connection.sessionid = roomid || connection.sessionid;

            connectSocket(function() {
                if (isData(connection.session)) {
                    openRoom(callback);
                    return;
                }

                connection.captureUserMedia(function() {
                    openRoom(callback);
                });
            });
        };

        // this object keeps extra-data records for all connected users
        // this object is never cleared so you can always access extra-data even if a user left
        connection.peersBackup = {};

        connection.deletePeer = function(remoteUserId) {
            if (!remoteUserId || !connection.peers[remoteUserId]) {
                return;
            }

            var eventObject = {
                userid: remoteUserId,
                extra: connection.peers[remoteUserId] ? connection.peers[remoteUserId].extra : {}
            };

            if (connection.peersBackup[eventObject.userid]) {
                eventObject.extra = connection.peersBackup[eventObject.userid].extra;
            }

            connection.onleave(eventObject);

            if (!!connection.peers[remoteUserId]) {
                connection.peers[remoteUserId].streams.forEach(function(stream) {
                    stream.stop();
                });

                var peer = connection.peers[remoteUserId].peer;
                if (peer && peer.iceConnectionState !== 'closed') {
                    try {
                        peer.close();
                    } catch (e) {}
                }

                if (connection.peers[remoteUserId]) {
                    connection.peers[remoteUserId].peer = null;
                    delete connection.peers[remoteUserId];
                }
            }
        }

        connection.rejoin = function(connectionDescription) {
            if (connection.isInitiator || !connectionDescription || !Object.keys(connectionDescription).length) {
                return;
            }

            var extra = {};

            if (connection.peers[connectionDescription.remoteUserId]) {
                extra = connection.peers[connectionDescription.remoteUserId].extra;
                connection.deletePeer(connectionDescription.remoteUserId);
            }

            if (connectionDescription && connectionDescription.remoteUserId) {
                connection.join(connectionDescription.remoteUserId);

                connection.onReConnecting({
                    userid: connectionDescription.remoteUserId,
                    extra: extra
                });
            }
        };

        connection.join = function(remoteUserId, options) {
            connection.sessionid = (remoteUserId ? remoteUserId.sessionid || remoteUserId.remoteUserId || remoteUserId : false) || connection.sessionid;
            connection.sessionid += '';

            var localPeerSdpConstraints = false;
            var remotePeerSdpConstraints = false;
            var isOneWay = false;
            var isDataOnly = false;

            if ((remoteUserId && remoteUserId.session) || !remoteUserId || typeof remoteUserId === 'string') {
                var session = remoteUserId ? remoteUserId.session || connection.session : connection.session;

                isOneWay = !!session.oneway;
                isDataOnly = isData(session);

                remotePeerSdpConstraints = {
                    OfferToReceiveAudio: connection.sdpConstraints.mandatory.OfferToReceiveAudio,
                    OfferToReceiveVideo: connection.sdpConstraints.mandatory.OfferToReceiveVideo
                };

                localPeerSdpConstraints = {
                    OfferToReceiveAudio: isOneWay ? !!connection.session.audio : connection.sdpConstraints.mandatory.OfferToReceiveAudio,
                    OfferToReceiveVideo: isOneWay ? !!connection.session.video || !!connection.session.screen : connection.sdpConstraints.mandatory.OfferToReceiveVideo
                };
            }

            options = options || {};

            var cb = function() {};
            if (typeof options === 'function') {
                cb = options;
                options = {};
            }

            if (typeof options.localPeerSdpConstraints !== 'undefined') {
                localPeerSdpConstraints = options.localPeerSdpConstraints;
            }

            if (typeof options.remotePeerSdpConstraints !== 'undefined') {
                remotePeerSdpConstraints = options.remotePeerSdpConstraints;
            }

            if (typeof options.isOneWay !== 'undefined') {
                isOneWay = options.isOneWay;
            }

            if (typeof options.isDataOnly !== 'undefined') {
                isDataOnly = options.isDataOnly;
            }

            var connectionDescription = {
                remoteUserId: connection.sessionid,
                message: {
                    newParticipationRequest: true,
                    isOneWay: isOneWay,
                    isDataOnly: isDataOnly,
                    localPeerSdpConstraints: localPeerSdpConstraints,
                    remotePeerSdpConstraints: remotePeerSdpConstraints
                },
                sender: connection.userid
            };

            beforeJoin(connectionDescription.message, function() {
                connectSocket(function() {
                    joinRoom(connectionDescription, cb);
                });
            });
            return connectionDescription;
        };

        function joinRoom(connectionDescription, cb) {
            connection.socket.emit('join-room', {
                sessionid: connection.sessionid,
                session: connection.session,
                mediaConstraints: connection.mediaConstraints,
                sdpConstraints: connection.sdpConstraints,
                streams: getStreamInfoForAdmin(),
                extra: connection.extra,
                password: typeof connection.password !== 'undefined' && typeof connection.password !== 'object' ? connection.password : ''
            }, function(isRoomJoined, error) {
                if (isRoomJoined === true) {
                    if (connection.enableLogs) {
                        console.log('isRoomJoined: ', isRoomJoined, ' roomid: ', connection.sessionid);
                    }

                    if (!!connection.peers[connection.sessionid]) {
                        // on socket disconnect & reconnect
                        return;
                    }

                    mPeer.onNegotiationNeeded(connectionDescription);
                }

                if (isRoomJoined === false) {
                    if (connection.enableLogs) {
                        console.warn('isRoomJoined: ', error, ' roomid: ', connection.sessionid);
                    }

                    // [disabled] retry after 3 seconds
                     false && 0;
                }

                cb(isRoomJoined, connection.sessionid, error);
            });
        }

        connection.publicRoomIdentifier = '';

        function openRoom(callback) {
            if (connection.enableLogs) {
                console.log('Sending open-room signal to socket.io');
            }

            connection.waitingForLocalMedia = false;
            connection.socket.emit('open-room', {
                sessionid: connection.sessionid,
                session: connection.session,
                mediaConstraints: connection.mediaConstraints,
                sdpConstraints: connection.sdpConstraints,
                streams: getStreamInfoForAdmin(),
                extra: connection.extra,
                identifier: connection.publicRoomIdentifier,
                password: typeof connection.password !== 'undefined' && typeof connection.password !== 'object' ? connection.password : ''
            }, function(isRoomOpened, error) {
                if (isRoomOpened === true) {
                    if (connection.enableLogs) {
                        console.log('isRoomOpened: ', isRoomOpened, ' roomid: ', connection.sessionid);
                    }
                    callback(isRoomOpened, connection.sessionid);
                }

                if (isRoomOpened === false) {
                    if (connection.enableLogs) {
                        console.warn('isRoomOpened: ', error, ' roomid: ', connection.sessionid);
                    }

                    callback(isRoomOpened, connection.sessionid, error);
                }
            });
        }

        function getStreamInfoForAdmin() {
            try {
                return connection.streamEvents.selectAll('local').map(function(event) {
                    return {
                        streamid: event.streamid,
                        tracks: event.stream.getTracks().length
                    };
                });
            } catch (e) {
                return [];
            }
        }

        function beforeJoin(userPreferences, callback) {
            if (connection.dontCaptureUserMedia || userPreferences.isDataOnly) {
                callback();
                return;
            }

            var localMediaConstraints = {};

            if (userPreferences.localPeerSdpConstraints.OfferToReceiveAudio) {
                localMediaConstraints.audio = connection.mediaConstraints.audio;
            }

            if (userPreferences.localPeerSdpConstraints.OfferToReceiveVideo) {
                localMediaConstraints.video = connection.mediaConstraints.video;
            }

            var session = userPreferences.session || connection.session;

            if (session.oneway && session.audio !== 'two-way' && session.video !== 'two-way' && session.screen !== 'two-way') {
                callback();
                return;
            }

            if (session.oneway && session.audio && session.audio === 'two-way') {
                session = {
                    audio: true
                };
            }

            if (session.audio || session.video || session.screen) {
                if (session.screen) {
                    if (DetectRTC.browser.name === 'Edge') {
                        navigator.getDisplayMedia({
                            video: true,
                            audio: isAudioPlusTab(connection)
                        }).then(function(screen) {
                            screen.isScreen = true;
                            mPeer.onGettingLocalMedia(screen);

                            if ((session.audio || session.video) && !isAudioPlusTab(connection)) {
                                connection.invokeGetUserMedia(null, callback);
                            } else {
                                callback(screen);
                            }
                        }, function(error) {
                            console.error('Unable to capture screen on Edge. HTTPs and version 17+ is required.');
                        });
                    } else {
                        connection.invokeGetUserMedia({
                            audio: isAudioPlusTab(connection),
                            video: true,
                            isScreen: true
                        }, (session.audio || session.video) && !isAudioPlusTab(connection) ? connection.invokeGetUserMedia(null, callback) : callback);
                    }
                } else if (session.audio || session.video) {
                    connection.invokeGetUserMedia(null, callback, session);
                }
            }
        }

        connection.getUserMedia = connection.captureUserMedia = function(callback, sessionForced) {
            callback = callback || function() {};
            var session = sessionForced || connection.session;

            if (connection.dontCaptureUserMedia || isData(session)) {
                callback();
                return;
            }

            if (session.audio || session.video || session.screen) {
                if (session.screen) {
                    if (DetectRTC.browser.name === 'Edge') {
                        navigator.getDisplayMedia({
                            video: true,
                            audio: isAudioPlusTab(connection)
                        }).then(function(screen) {
                            screen.isScreen = true;
                            mPeer.onGettingLocalMedia(screen);

                            if ((session.audio || session.video) && !isAudioPlusTab(connection)) {
                                var nonScreenSession = {};
                                for (var s in session) {
                                    if (s !== 'screen') {
                                        nonScreenSession[s] = session[s];
                                    }
                                }
                                connection.invokeGetUserMedia(sessionForced, callback, nonScreenSession);
                                return;
                            }
                            callback(screen);
                        }, function(error) {
                            console.error('Unable to capture screen on Edge. HTTPs and version 17+ is required.');
                        });
                    } else {
                        connection.invokeGetUserMedia({
                            audio: isAudioPlusTab(connection),
                            video: true,
                            isScreen: true
                        }, function(stream) {
                            if ((session.audio || session.video) && !isAudioPlusTab(connection)) {
                                var nonScreenSession = {};
                                for (var s in session) {
                                    if (s !== 'screen') {
                                        nonScreenSession[s] = session[s];
                                    }
                                }
                                connection.invokeGetUserMedia(sessionForced, callback, nonScreenSession);
                                return;
                            }
                            callback(stream);
                        });
                    }
                } else if (session.audio || session.video) {
                    connection.invokeGetUserMedia(sessionForced, callback, session);
                }
            }
        };

        connection.onbeforeunload = function(arg1, dontCloseSocket) {
            if (!connection.closeBeforeUnload) {
                return;
            }

            connection.peers.getAllParticipants().forEach(function(participant) {
                mPeer.onNegotiationNeeded({
                    userLeft: true
                }, participant);

                if (connection.peers[participant] && connection.peers[participant].peer) {
                    connection.peers[participant].peer.close();
                }

                delete connection.peers[participant];
            });

            if (!dontCloseSocket) {
                connection.closeSocket();
            }

            connection.isInitiator = false;
        };

        if (!window.ignoreBeforeUnload) {
            // user can implement its own version of window.onbeforeunload
            connection.closeBeforeUnload = true;
            window.addEventListener('beforeunload', connection.onbeforeunload, false);
        } else {
            connection.closeBeforeUnload = false;
        }

        connection.userid = getRandomString();
        connection.changeUserId = function(newUserId, callback) {
            callback = callback || function() {};
            connection.userid = newUserId || getRandomString();
            connection.socket.emit('changed-uuid', connection.userid, callback);
        };

        connection.extra = {};
        connection.attachStreams = [];

        connection.session = {
            audio: true,
            video: true
        };

        connection.enableFileSharing = false;

        // all values in kbps
        connection.bandwidth = {
            screen: false,
            audio: false,
            video: false
        };

        connection.codecs = {
            audio: 'opus',
            video: 'VP9'
        };

        connection.processSdp = function(sdp) {
            // ignore SDP modification if unified-pan is supported
            if (isUnifiedPlanSupportedDefault()) {
                return sdp;
            }

            if (DetectRTC.browser.name === 'Safari') {
                return sdp;
            }

            if (connection.codecs.video.toUpperCase() === 'VP8') {
                sdp = CodecsHandler.preferCodec(sdp, 'vp8');
            }

            if (connection.codecs.video.toUpperCase() === 'VP9') {
                sdp = CodecsHandler.preferCodec(sdp, 'vp9');
            }

            if (connection.codecs.video.toUpperCase() === 'H264') {
                sdp = CodecsHandler.preferCodec(sdp, 'h264');
            }

            if (connection.codecs.audio === 'G722') {
                sdp = CodecsHandler.removeNonG722(sdp);
            }

            if (DetectRTC.browser.name === 'Firefox') {
                return sdp;
            }

            if (connection.bandwidth.video || connection.bandwidth.screen) {
                sdp = CodecsHandler.setApplicationSpecificBandwidth(sdp, connection.bandwidth, !!connection.session.screen);
            }

            if (connection.bandwidth.video) {
                sdp = CodecsHandler.setVideoBitrates(sdp, {
                    min: connection.bandwidth.video * 8 * 1024,
                    max: connection.bandwidth.video * 8 * 1024
                });
            }

            if (connection.bandwidth.audio) {
                sdp = CodecsHandler.setOpusAttributes(sdp, {
                    maxaveragebitrate: connection.bandwidth.audio * 8 * 1024,
                    maxplaybackrate: connection.bandwidth.audio * 8 * 1024,
                    stereo: 1,
                    maxptime: 3
                });
            }

            return sdp;
        };

        if (typeof CodecsHandler !== 'undefined') {
            connection.BandwidthHandler = connection.CodecsHandler = CodecsHandler;
        }

        connection.mediaConstraints = {
            audio: {
                mandatory: {},
                optional: connection.bandwidth.audio ? [{
                    bandwidth: connection.bandwidth.audio * 8 * 1024 || 128 * 8 * 1024
                }] : []
            },
            video: {
                mandatory: {},
                optional: connection.bandwidth.video ? [{
                    bandwidth: connection.bandwidth.video * 8 * 1024 || 128 * 8 * 1024
                }, {
                    facingMode: 'user'
                }] : [{
                    facingMode: 'user'
                }]
            }
        };

        if (DetectRTC.browser.name === 'Firefox') {
            connection.mediaConstraints = {
                audio: true,
                video: true
            };
        }

        if (!forceOptions.useDefaultDevices && !DetectRTC.isMobileDevice) {
            DetectRTC.load(function() {
                var lastAudioDevice, lastVideoDevice;
                // it will force RTCMultiConnection to capture last-devices
                // i.e. if external microphone is attached to system, we should prefer it over built-in devices.
                DetectRTC.MediaDevices.forEach(function(device) {
                    if (device.kind === 'audioinput' && connection.mediaConstraints.audio !== false) {
                        lastAudioDevice = device;
                    }

                    if (device.kind === 'videoinput' && connection.mediaConstraints.video !== false) {
                        lastVideoDevice = device;
                    }
                });

                if (lastAudioDevice) {
                    if (DetectRTC.browser.name === 'Firefox') {
                        if (connection.mediaConstraints.audio !== true) {
                            connection.mediaConstraints.audio.deviceId = lastAudioDevice.id;
                        } else {
                            connection.mediaConstraints.audio = {
                                deviceId: lastAudioDevice.id
                            }
                        }
                        return;
                    }

                    if (connection.mediaConstraints.audio == true) {
                        connection.mediaConstraints.audio = {
                            mandatory: {},
                            optional: []
                        }
                    }

                    if (!connection.mediaConstraints.audio.optional) {
                        connection.mediaConstraints.audio.optional = [];
                    }

                    var optional = [{
                        sourceId: lastAudioDevice.id
                    }];

                    connection.mediaConstraints.audio.optional = optional.concat(connection.mediaConstraints.audio.optional);
                }

                if (lastVideoDevice) {
                    if (DetectRTC.browser.name === 'Firefox') {
                        if (connection.mediaConstraints.video !== true) {
                            connection.mediaConstraints.video.deviceId = lastVideoDevice.id;
                        } else {
                            connection.mediaConstraints.video = {
                                deviceId: lastVideoDevice.id
                            }
                        }
                        return;
                    }

                    if (connection.mediaConstraints.video == true) {
                        connection.mediaConstraints.video = {
                            mandatory: {},
                            optional: []
                        }
                    }

                    if (!connection.mediaConstraints.video.optional) {
                        connection.mediaConstraints.video.optional = [];
                    }

                    var optional = [{
                        sourceId: lastVideoDevice.id
                    }];

                    connection.mediaConstraints.video.optional = optional.concat(connection.mediaConstraints.video.optional);
                }
            });
        }

        connection.sdpConstraints = {
            mandatory: {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: true
            },
            optional: [{
                VoiceActivityDetection: false
            }]
        };

        connection.sdpSemantics = null; // "unified-plan" or "plan-b", ref: webrtc.org/web-apis/chrome/unified-plan/
        connection.iceCandidatePoolSize = null; // 0
        connection.bundlePolicy = null; // max-bundle
        connection.rtcpMuxPolicy = null; // "require" or "negotiate"
        connection.iceTransportPolicy = null; // "relay" or "all"
        connection.optionalArgument = {
            optional: [{
                DtlsSrtpKeyAgreement: true
            }, {
                googImprovedWifiBwe: true
            }, {
                googScreencastMinBitrate: 300
            }, {
                googIPv6: true
            }, {
                googDscp: true
            }, {
                googCpuUnderuseThreshold: 55
            }, {
                googCpuOveruseThreshold: 85
            }, {
                googSuspendBelowMinBitrate: true
            }, {
                googCpuOveruseDetection: true
            }],
            mandatory: {}
        };

        connection.iceServers = IceServersHandler.getIceServers(connection);

        connection.candidates = {
            host: true,
            stun: true,
            turn: true
        };

        connection.iceProtocols = {
            tcp: true,
            udp: true
        };

        // EVENTs
        connection.onopen = function(event) {
            if (!!connection.enableLogs) {
                console.info('Data connection has been opened between you & ', event.userid);
            }
        };

        connection.onclose = function(event) {
            if (!!connection.enableLogs) {
                console.warn('Data connection has been closed between you & ', event.userid);
            }
        };

        connection.onerror = function(error) {
            if (!!connection.enableLogs) {
                console.error(error.userid, 'data-error', error);
            }
        };

        connection.onmessage = function(event) {
            if (!!connection.enableLogs) {
                console.debug('data-message', event.userid, event.data);
            }
        };

        connection.send = function(data, remoteUserId) {
            connection.peers.send(data, remoteUserId);
        };

        connection.close = connection.disconnect = connection.leave = function() {
            connection.onbeforeunload(false, true);
        };

        connection.closeEntireSession = function(callback) {
            callback = callback || function() {};
            connection.socket.emit('close-entire-session', function looper() {
                if (connection.getAllParticipants().length) {
                    setTimeout(looper, 100);
                    return;
                }

                connection.onEntireSessionClosed({
                    sessionid: connection.sessionid,
                    userid: connection.userid,
                    extra: connection.extra
                });

                connection.changeUserId(null, function() {
                    connection.close();
                    callback();
                });
            });
        };

        connection.onEntireSessionClosed = function(event) {
            if (!connection.enableLogs) return;
            console.info('Entire session is closed: ', event.sessionid, event.extra);
        };

        connection.onstream = function(e) {
            var parentNode = connection.videosContainer;
            parentNode.insertBefore(e.mediaElement, parentNode.firstChild);
            var played = e.mediaElement.play();

            if (typeof played !== 'undefined') {
                played.catch(function() {
                    /*** iOS 11 doesn't allow automatic play and rejects ***/
                }).then(function() {
                    setTimeout(function() {
                        e.mediaElement.play();
                    }, 2000);
                });
                return;
            }

            setTimeout(function() {
                e.mediaElement.play();
            }, 2000);
        };

        connection.onstreamended = function(e) {
            if (!e.mediaElement) {
                e.mediaElement = document.getElementById(e.streamid);
            }

            if (!e.mediaElement || !e.mediaElement.parentNode) {
                return;
            }

            e.mediaElement.parentNode.removeChild(e.mediaElement);
        };

        connection.direction = 'many-to-many';

        connection.removeStream = function(streamid, remoteUserId) {
            var stream;
            connection.attachStreams.forEach(function(localStream) {
                if (localStream.id === streamid) {
                    stream = localStream;
                }
            });

            if (!stream) {
                console.warn('No such stream exist.', streamid);
                return;
            }

            connection.peers.getAllParticipants().forEach(function(participant) {
                if (remoteUserId && participant !== remoteUserId) {
                    return;
                }

                var user = connection.peers[participant];
                try {
                    user.peer.removeStream(stream);
                } catch (e) {}
            });

            connection.renegotiate();
        };

        connection.addStream = function(session, remoteUserId) {
            if (!!session.getTracks) {
                if (connection.attachStreams.indexOf(session) === -1) {
                    if (!session.streamid) {
                        session.streamid = session.id;
                    }

                    connection.attachStreams.push(session);
                }
                connection.renegotiate(remoteUserId);
                return;
            }

            if (isData(session)) {
                connection.renegotiate(remoteUserId);
                return;
            }

            if (session.audio || session.video || session.screen) {
                if (session.screen) {
                    if (DetectRTC.browser.name === 'Edge') {
                        navigator.getDisplayMedia({
                            video: true,
                            audio: isAudioPlusTab(connection)
                        }).then(function(screen) {
                            screen.isScreen = true;
                            mPeer.onGettingLocalMedia(screen);

                            if ((session.audio || session.video) && !isAudioPlusTab(connection)) {
                                connection.invokeGetUserMedia(null, function(stream) {
                                    gumCallback(stream);
                                });
                            } else {
                                gumCallback(screen);
                            }
                        }, function(error) {
                            console.error('Unable to capture screen on Edge. HTTPs and version 17+ is required.');
                        });
                    } else {
                        connection.invokeGetUserMedia({
                            audio: isAudioPlusTab(connection),
                            video: true,
                            isScreen: true
                        }, function(stream) {
                            if ((session.audio || session.video) && !isAudioPlusTab(connection)) {
                                connection.invokeGetUserMedia(null, function(stream) {
                                    gumCallback(stream);
                                });
                            } else {
                                gumCallback(stream);
                            }
                        });
                    }
                } else if (session.audio || session.video) {
                    connection.invokeGetUserMedia(null, gumCallback);
                }
            }

            function gumCallback(stream) {
                if (session.streamCallback) {
                    session.streamCallback(stream);
                }

                connection.renegotiate(remoteUserId);
            }
        };

        connection.invokeGetUserMedia = function(localMediaConstraints, callback, session) {
            if (!session) {
                session = connection.session;
            }

            if (!localMediaConstraints) {
                localMediaConstraints = connection.mediaConstraints;
            }

            getUserMediaHandler({
                onGettingLocalMedia: function(stream) {
                    var videoConstraints = localMediaConstraints.video;
                    if (videoConstraints) {
                        if (videoConstraints.mediaSource || videoConstraints.mozMediaSource) {
                            stream.isScreen = true;
                        } else if (videoConstraints.mandatory && videoConstraints.mandatory.chromeMediaSource) {
                            stream.isScreen = true;
                        }
                    }

                    if (!stream.isScreen) {
                        stream.isVideo = !!getTracks(stream, 'video').length;
                        stream.isAudio = !stream.isVideo && getTracks(stream, 'audio').length;
                    }

                    mPeer.onGettingLocalMedia(stream, function() {
                        if (typeof callback === 'function') {
                            callback(stream);
                        }
                    });
                },
                onLocalMediaError: function(error, constraints) {
                    mPeer.onLocalMediaError(error, constraints);
                },
                localMediaConstraints: localMediaConstraints || {
                    audio: session.audio ? localMediaConstraints.audio : false,
                    video: session.video ? localMediaConstraints.video : false
                }
            });
        };

        function applyConstraints(stream, mediaConstraints) {
            if (!stream) {
                if (!!connection.enableLogs) {
                    console.error('No stream to applyConstraints.');
                }
                return;
            }

            if (mediaConstraints.audio) {
                getTracks(stream, 'audio').forEach(function(track) {
                    track.applyConstraints(mediaConstraints.audio);
                });
            }

            if (mediaConstraints.video) {
                getTracks(stream, 'video').forEach(function(track) {
                    track.applyConstraints(mediaConstraints.video);
                });
            }
        }

        connection.applyConstraints = function(mediaConstraints, streamid) {
            if (!MediaStreamTrack || !MediaStreamTrack.prototype.applyConstraints) {
                alert('track.applyConstraints is NOT supported in your browser.');
                return;
            }

            if (streamid) {
                var stream;
                if (connection.streamEvents[streamid]) {
                    stream = connection.streamEvents[streamid].stream;
                }
                applyConstraints(stream, mediaConstraints);
                return;
            }

            connection.attachStreams.forEach(function(stream) {
                applyConstraints(stream, mediaConstraints);
            });
        };

        function replaceTrack(track, remoteUserId, isVideoTrack) {
            if (remoteUserId) {
                mPeer.replaceTrack(track, remoteUserId, isVideoTrack);
                return;
            }

            connection.peers.getAllParticipants().forEach(function(participant) {
                mPeer.replaceTrack(track, participant, isVideoTrack);
            });
        }

        connection.replaceTrack = function(session, remoteUserId, isVideoTrack) {
            session = session || {};

            if (!RTCPeerConnection.prototype.getSenders) {
                connection.addStream(session);
                return;
            }

            if (session instanceof MediaStreamTrack) {
                replaceTrack(session, remoteUserId, isVideoTrack);
                return;
            }

            if (session instanceof MediaStream) {
                if (getTracks(session, 'video').length) {
                    replaceTrack(getTracks(session, 'video')[0], remoteUserId, true);
                }

                if (getTracks(session, 'audio').length) {
                    replaceTrack(getTracks(session, 'audio')[0], remoteUserId, false);
                }
                return;
            }

            if (isData(session)) {
                throw 'connection.replaceTrack requires audio and/or video and/or screen.';
                return;
            }

            if (session.audio || session.video || session.screen) {
                if (session.screen) {
                    if (DetectRTC.browser.name === 'Edge') {
                        navigator.getDisplayMedia({
                            video: true,
                            audio: isAudioPlusTab(connection)
                        }).then(function(screen) {
                            screen.isScreen = true;
                            mPeer.onGettingLocalMedia(screen);

                            if ((session.audio || session.video) && !isAudioPlusTab(connection)) {
                                connection.invokeGetUserMedia(null, gumCallback);
                            } else {
                                gumCallback(screen);
                            }
                        }, function(error) {
                            console.error('Unable to capture screen on Edge. HTTPs and version 17+ is required.');
                        });
                    } else {
                        connection.invokeGetUserMedia({
                            audio: isAudioPlusTab(connection),
                            video: true,
                            isScreen: true
                        }, (session.audio || session.video) && !isAudioPlusTab(connection) ? connection.invokeGetUserMedia(null, gumCallback) : gumCallback);
                    }
                } else if (session.audio || session.video) {
                    connection.invokeGetUserMedia(null, gumCallback);
                }
            }

            function gumCallback(stream) {
                connection.replaceTrack(stream, remoteUserId, isVideoTrack || session.video || session.screen);
            }
        };

        connection.resetTrack = function(remoteUsersIds, isVideoTrack) {
            if (!remoteUsersIds) {
                remoteUsersIds = connection.getAllParticipants();
            }

            if (typeof remoteUsersIds == 'string') {
                remoteUsersIds = [remoteUsersIds];
            }

            remoteUsersIds.forEach(function(participant) {
                var peer = connection.peers[participant].peer;

                if ((typeof isVideoTrack === 'undefined' || isVideoTrack === true) && peer.lastVideoTrack) {
                    connection.replaceTrack(peer.lastVideoTrack, participant, true);
                }

                if ((typeof isVideoTrack === 'undefined' || isVideoTrack === false) && peer.lastAudioTrack) {
                    connection.replaceTrack(peer.lastAudioTrack, participant, false);
                }
            });
        };

        connection.renegotiate = function(remoteUserId) {
            if (remoteUserId) {
                mPeer.renegotiatePeer(remoteUserId);
                return;
            }

            connection.peers.getAllParticipants().forEach(function(participant) {
                mPeer.renegotiatePeer(participant);
            });
        };

        connection.setStreamEndHandler = function(stream, isRemote) {
            if (!stream || !stream.addEventListener) return;

            isRemote = !!isRemote;

            if (stream.alreadySetEndHandler) {
                return;
            }
            stream.alreadySetEndHandler = true;

            var streamEndedEvent = 'ended';

            if ('oninactive' in stream) {
                streamEndedEvent = 'inactive';
            }

            stream.addEventListener(streamEndedEvent, function() {
                if (stream.idInstance) {
                    currentUserMediaRequest.remove(stream.idInstance);
                }

                if (!isRemote) {
                    // reset attachStreams
                    var streams = [];
                    connection.attachStreams.forEach(function(s) {
                        if (s.id != stream.id) {
                            streams.push(s);
                        }
                    });
                    connection.attachStreams = streams;
                }

                // connection.renegotiate();

                var streamEvent = connection.streamEvents[stream.streamid];
                if (!streamEvent) {
                    streamEvent = {
                        stream: stream,
                        streamid: stream.streamid,
                        type: isRemote ? 'remote' : 'local',
                        userid: connection.userid,
                        extra: connection.extra,
                        mediaElement: connection.streamEvents[stream.streamid] ? connection.streamEvents[stream.streamid].mediaElement : null
                    };
                }

                if (isRemote && connection.peers[streamEvent.userid]) {
                    // reset remote "streams"
                    var peer = connection.peers[streamEvent.userid].peer;
                    var streams = [];
                    peer.getRemoteStreams().forEach(function(s) {
                        if (s.id != stream.id) {
                            streams.push(s);
                        }
                    });
                    connection.peers[streamEvent.userid].streams = streams;
                }

                if (streamEvent.userid === connection.userid && streamEvent.type === 'remote') {
                    return;
                }

                if (connection.peersBackup[streamEvent.userid]) {
                    streamEvent.extra = connection.peersBackup[streamEvent.userid].extra;
                }

                connection.onstreamended(streamEvent);

                delete connection.streamEvents[stream.streamid];
            }, false);
        };

        connection.onMediaError = function(error, constraints) {
            if (!!connection.enableLogs) {
                console.error(error, constraints);
            }
        };

        connection.autoCloseEntireSession = false;

        connection.filesContainer = connection.videosContainer = document.body || document.documentElement;
        connection.isInitiator = false;

        connection.shareFile = mPeer.shareFile;
        if (typeof FileProgressBarHandler !== 'undefined') {
            FileProgressBarHandler.handle(connection);
        }

        if (typeof TranslationHandler !== 'undefined') {
            TranslationHandler.handle(connection);
        }

        connection.token = getRandomString;

        connection.onNewParticipant = function(participantId, userPreferences) {
            connection.acceptParticipationRequest(participantId, userPreferences);
        };

        connection.acceptParticipationRequest = function(participantId, userPreferences) {
            if (userPreferences.successCallback) {
                userPreferences.successCallback();
                delete userPreferences.successCallback;
            }

            mPeer.createNewPeer(participantId, userPreferences);
        };

        if (typeof StreamsHandler !== 'undefined') {
            connection.StreamsHandler = StreamsHandler;
        }

        connection.onleave = function(userid) {};

        connection.invokeSelectFileDialog = function(callback) {
            var selector = new FileSelector();
            selector.accept = '*.*';
            selector.selectSingleFile(callback);
        };

        connection.onmute = function(e) {
            if (!e || !e.mediaElement) {
                return;
            }

            if (e.muteType === 'both' || e.muteType === 'video') {
                e.mediaElement.src = null;
                var paused = e.mediaElement.pause();
                if (typeof paused !== 'undefined') {
                    paused.then(function() {
                        e.mediaElement.poster = e.snapshot || 'https://cdn.webrtc-experiment.com/images/muted.png';
                    });
                } else {
                    e.mediaElement.poster = e.snapshot || 'https://cdn.webrtc-experiment.com/images/muted.png';
                }
            } else if (e.muteType === 'audio') {
                e.mediaElement.muted = true;
            }
        };

        connection.onunmute = function(e) {
            if (!e || !e.mediaElement || !e.stream) {
                return;
            }

            if (e.unmuteType === 'both' || e.unmuteType === 'video') {
                e.mediaElement.poster = null;
                e.mediaElement.srcObject = e.stream;
                e.mediaElement.play();
            } else if (e.unmuteType === 'audio') {
                e.mediaElement.muted = false;
            }
        };

        connection.onExtraDataUpdated = function(event) {
            event.status = 'online';
            connection.onUserStatusChanged(event, true);
        };

        connection.getAllParticipants = function(sender) {
            return connection.peers.getAllParticipants(sender);
        };

        if (typeof StreamsHandler !== 'undefined') {
            StreamsHandler.onSyncNeeded = function(streamid, action, type) {
                connection.peers.getAllParticipants().forEach(function(participant) {
                    mPeer.onNegotiationNeeded({
                        streamid: streamid,
                        action: action,
                        streamSyncNeeded: true,
                        type: type || 'both'
                    }, participant);
                });
            };
        }

        connection.connectSocket = function(callback) {
            connectSocket(callback);
        };

        connection.closeSocket = function() {
            try {
                io.sockets = {};
            } catch (e) {};

            if (!connection.socket) return;

            if (typeof connection.socket.disconnect === 'function') {
                connection.socket.disconnect();
            }

            if (typeof connection.socket.resetProps === 'function') {
                connection.socket.resetProps();
            }

            connection.socket = null;
        };

        connection.getSocket = function(callback) {
            if (!callback && connection.enableLogs) {
                console.warn('getSocket.callback paramter is required.');
            }

            callback = callback || function() {};

            if (!connection.socket) {
                connectSocket(function() {
                    callback(connection.socket);
                });
            } else {
                callback(connection.socket);
            }

            return connection.socket; // callback is preferred over return-statement
        };

        connection.getRemoteStreams = mPeer.getRemoteStreams;

        var skipStreams = ['selectFirst', 'selectAll', 'forEach'];

        connection.streamEvents = {
            selectFirst: function(options) {
                return connection.streamEvents.selectAll(options)[0];
            },
            selectAll: function(options) {
                if (!options) {
                    // default will always be all streams
                    options = {
                        local: true,
                        remote: true,
                        isScreen: true,
                        isAudio: true,
                        isVideo: true
                    };
                }

                if (options == 'local') {
                    options = {
                        local: true
                    };
                }

                if (options == 'remote') {
                    options = {
                        remote: true
                    };
                }

                if (options == 'screen') {
                    options = {
                        isScreen: true
                    };
                }

                if (options == 'audio') {
                    options = {
                        isAudio: true
                    };
                }

                if (options == 'video') {
                    options = {
                        isVideo: true
                    };
                }

                var streams = [];
                Object.keys(connection.streamEvents).forEach(function(key) {
                    var event = connection.streamEvents[key];

                    if (skipStreams.indexOf(key) !== -1) return;
                    var ignore = true;

                    if (options.local && event.type === 'local') {
                        ignore = false;
                    }

                    if (options.remote && event.type === 'remote') {
                        ignore = false;
                    }

                    if (options.isScreen && event.stream.isScreen) {
                        ignore = false;
                    }

                    if (options.isVideo && event.stream.isVideo) {
                        ignore = false;
                    }

                    if (options.isAudio && event.stream.isAudio) {
                        ignore = false;
                    }

                    if (options.userid && event.userid === options.userid) {
                        ignore = false;
                    }

                    if (ignore === false) {
                        streams.push(event);
                    }
                });

                return streams;
            }
        };

        connection.socketURL = '/'; // generated via config.json
        connection.socketMessageEvent = 'RTCMultiConnection-Message'; // generated via config.json
        connection.socketCustomEvent = 'RTCMultiConnection-Custom-Message'; // generated via config.json
        connection.DetectRTC = DetectRTC;

        connection.setCustomSocketEvent = function(customEvent) {
            if (customEvent) {
                connection.socketCustomEvent = customEvent;
            }

            if (!connection.socket) {
                return;
            }

            connection.socket.emit('set-custom-socket-event-listener', connection.socketCustomEvent);
        };

        connection.getNumberOfBroadcastViewers = function(broadcastId, callback) {
            if (!connection.socket || !broadcastId || !callback) return;

            connection.socket.emit('get-number-of-users-in-specific-broadcast', broadcastId, callback);
        };

        connection.onNumberOfBroadcastViewersUpdated = function(event) {
            if (!connection.enableLogs || !connection.isInitiator) return;
            console.info('Number of broadcast (', event.broadcastId, ') viewers', event.numberOfBroadcastViewers);
        };

        connection.onUserStatusChanged = function(event, dontWriteLogs) {
            if (!!connection.enableLogs && !dontWriteLogs) {
                console.info(event.userid, event.status);
            }
        };

        connection.getUserMediaHandler = getUserMediaHandler;
        connection.multiPeersHandler = mPeer;
        connection.enableLogs = true;
        connection.setCustomSocketHandler = function(customSocketHandler) {
            if (typeof SocketConnection !== 'undefined') {
                SocketConnection = customSocketHandler;
            }
        };

        // default value should be 15k because [old]Firefox's receiving limit is 16k!
        // however 64k works chrome-to-chrome
        connection.chunkSize = 40 * 1000;

        connection.maxParticipantsAllowed = 1000;

        // eject or leave single user
        connection.disconnectWith = mPeer.disconnectWith;

        // check if room exist on server
        // we will pass roomid to the server and wait for callback (i.e. server's response)
        connection.checkPresence = function(roomid, callback) {
            roomid = roomid || connection.sessionid;

            if (SocketConnection.name === 'SSEConnection') {
                SSEConnection.checkPresence(roomid, function(isRoomExist, _roomid, extra) {
                    if (!connection.socket) {
                        if (!isRoomExist) {
                            connection.userid = _roomid;
                        }

                        connection.connectSocket(function() {
                            callback(isRoomExist, _roomid, extra);
                        });
                        return;
                    }
                    callback(isRoomExist, _roomid);
                });
                return;
            }

            if (!connection.socket) {
                connection.connectSocket(function() {
                    connection.checkPresence(roomid, callback);
                });
                return;
            }

            connection.socket.emit('check-presence', roomid + '', function(isRoomExist, _roomid, extra) {
                if (connection.enableLogs) {
                    console.log('checkPresence.isRoomExist: ', isRoomExist, ' roomid: ', _roomid);
                }
                callback(isRoomExist, _roomid, extra);
            });
        };

        connection.onReadyForOffer = function(remoteUserId, userPreferences) {
            connection.multiPeersHandler.createNewPeer(remoteUserId, userPreferences);
        };

        connection.setUserPreferences = function(userPreferences) {
            if (connection.dontAttachStream) {
                userPreferences.dontAttachLocalStream = true;
            }

            if (connection.dontGetRemoteStream) {
                userPreferences.dontGetRemoteStream = true;
            }

            return userPreferences;
        };

        connection.updateExtraData = function() {
            connection.socket.emit('extra-data-updated', connection.extra);
        };

        connection.enableScalableBroadcast = false;
        connection.maxRelayLimitPerUser = 3; // each broadcast should serve only 3 users

        connection.dontCaptureUserMedia = false;
        connection.dontAttachStream = false;
        connection.dontGetRemoteStream = false;

        connection.onReConnecting = function(event) {
            if (connection.enableLogs) {
                console.info('ReConnecting with', event.userid, '...');
            }
        };

        connection.beforeAddingStream = function(stream) {
            return stream;
        };

        connection.beforeRemovingStream = function(stream) {
            return stream;
        };

        if (typeof isChromeExtensionAvailable !== 'undefined') {
            connection.checkIfChromeExtensionAvailable = isChromeExtensionAvailable;
        }

        if (typeof isFirefoxExtensionAvailable !== 'undefined') {
            connection.checkIfChromeExtensionAvailable = isFirefoxExtensionAvailable;
        }

        if (typeof getChromeExtensionStatus !== 'undefined') {
            connection.getChromeExtensionStatus = getChromeExtensionStatus;
        }

        connection.modifyScreenConstraints = function(screen_constraints) {
            return screen_constraints;
        };

        connection.onPeerStateChanged = function(state) {
            if (connection.enableLogs) {
                if (state.iceConnectionState.search(/closed|failed/gi) !== -1) {
                    console.error('Peer connection is closed between you & ', state.userid, state.extra, 'state:', state.iceConnectionState);
                }
            }
        };

        connection.isOnline = true;

        listenEventHandler('online', function() {
            connection.isOnline = true;
        });

        listenEventHandler('offline', function() {
            connection.isOnline = false;
        });

        connection.isLowBandwidth = false;
        if (navigator && navigator.connection && navigator.connection.type) {
            connection.isLowBandwidth = navigator.connection.type.toString().toLowerCase().search(/wifi|cell/g) !== -1;
            if (connection.isLowBandwidth) {
                connection.bandwidth = {
                    audio: false,
                    video: false,
                    screen: false
                };

                if (connection.mediaConstraints.audio && connection.mediaConstraints.audio.optional && connection.mediaConstraints.audio.optional.length) {
                    var newArray = [];
                    connection.mediaConstraints.audio.optional.forEach(function(opt) {
                        if (typeof opt.bandwidth === 'undefined') {
                            newArray.push(opt);
                        }
                    });
                    connection.mediaConstraints.audio.optional = newArray;
                }

                if (connection.mediaConstraints.video && connection.mediaConstraints.video.optional && connection.mediaConstraints.video.optional.length) {
                    var newArray = [];
                    connection.mediaConstraints.video.optional.forEach(function(opt) {
                        if (typeof opt.bandwidth === 'undefined') {
                            newArray.push(opt);
                        }
                    });
                    connection.mediaConstraints.video.optional = newArray;
                }
            }
        }

        connection.getExtraData = function(remoteUserId, callback) {
            if (!remoteUserId) throw 'remoteUserId is required.';

            if (typeof callback === 'function') {
                connection.socket.emit('get-remote-user-extra-data', remoteUserId, function(extra, remoteUserId, error) {
                    callback(extra, remoteUserId, error);
                });
                return;
            }

            if (!connection.peers[remoteUserId]) {
                if (connection.peersBackup[remoteUserId]) {
                    return connection.peersBackup[remoteUserId].extra;
                }
                return {};
            }

            return connection.peers[remoteUserId].extra;
        };

        if (!!forceOptions.autoOpenOrJoin) {
            connection.openOrJoin(connection.sessionid);
        }

        connection.onUserIdAlreadyTaken = function(useridAlreadyTaken, yourNewUserId) {
            // via #683
            connection.close();
            connection.closeSocket();

            connection.isInitiator = false;
            connection.userid = connection.token();

            connection.join(connection.sessionid);

            if (connection.enableLogs) {
                console.warn('Userid already taken.', useridAlreadyTaken, 'Your new userid:', connection.userid);
            }
        };

        connection.trickleIce = true;
        connection.version = '3.7.0';

        connection.onSettingLocalDescription = function(event) {
            if (connection.enableLogs) {
                console.info('Set local description for remote user', event.userid);
            }
        };

        connection.resetScreen = function() {
            sourceId = null;
            if (DetectRTC && DetectRTC.screen) {
                delete DetectRTC.screen.sourceId;
            }

            currentUserMediaRequest = {
                streams: [],
                mutex: false,
                queueRequests: []
            };
        };

        // if disabled, "event.mediaElement" for "onstream" will be NULL
        connection.autoCreateMediaElement = true;

        // set password
        connection.password = null;

        // set password
        connection.setPassword = function(password, callback) {
            callback = callback || function() {};
            if (connection.socket) {
                connection.socket.emit('set-password', password, callback);
            } else {
                connection.password = password;
                callback(true, connection.sessionid, null);
            }
        };

        connection.onSocketDisconnect = function(event) {
            if (connection.enableLogs) {
                console.warn('socket.io connection is closed');
            }
        };

        connection.onSocketError = function(event) {
            if (connection.enableLogs) {
                console.warn('socket.io connection is failed');
            }
        };

        // error messages
        connection.errors = {
            ROOM_NOT_AVAILABLE: 'Room not available',
            INVALID_PASSWORD: 'Invalid password',
            USERID_NOT_AVAILABLE: 'User ID does not exist',
            ROOM_PERMISSION_DENIED: 'Room permission denied',
            ROOM_FULL: 'Room full',
            DID_NOT_JOIN_ANY_ROOM: 'Did not join any room yet',
            INVALID_SOCKET: 'Invalid socket',
            PUBLIC_IDENTIFIER_MISSING: 'publicRoomIdentifier is required',
            INVALID_ADMIN_CREDENTIAL: 'Invalid username or password attempted'
        };
    })(this);

};

if (true /* && !!module.exports*/ ) {
    module.exports = exports = RTCMultiConnection;
}

if (true) {
    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = (function() {
        return RTCMultiConnection;
    }).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
}



/***/ }),

/***/ "./src/client/connection.js":
/*!**********************************!*\
  !*** ./src/client/connection.js ***!
  \**********************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var RTCMultiConnection = __webpack_require__(/*! ./RTC-MultiConnection.js */ "./src/client/RTC-MultiConnection.js");
async function connect()
{
    let connection = new RTCMultiConnection();
    connection.socketURL = "http://localhost:80/";
    connection.session = {data: true};
    connection.enableLogs = true;
    
 
    return new Promise(function(resolve, reject) {
        connection.connectSocket(()=>
        {
            connection.getSocket((socket)=>
            {
                let socketID = socket.id
                resolve([connection,socketID])
            })
               
        })
    })
    
}

module.exports = 
{
    connect,
}

/***/ }),

/***/ "./src/client/rooms.js":
/*!*****************************!*\
  !*** ./src/client/rooms.js ***!
  \*****************************/
/***/ ((module) => {

 async function create(connection)
{
   
    connection.socket.emit("create-new-room");

    return new Promise(function(resolve, reject) {
        connection.socket.on("new-room-is-created",(currentRoomId)=>
        {
            

                connection.openOrJoin(currentRoomId,()=>
                {
                    connection.socket.emit("joined-a-room",(connection.socket.id),currentRoomId);
                    resolve(currentRoomId)
                    
                })
                
        })

    })    
}

async function join(connection,currentRoomId)
{
    return new Promise(function(resolve, reject) {
    connection.join(currentRoomId,()=>
    {
        connection.socket.emit("joined-a-room",connection.socket.id,currentRoomId);
        
    })
    
    let isConnected = true
    resolve(isConnected)
    })
}

module.exports =
{   
    create,
    join,

}

/***/ }),

/***/ "./src/editor/editorv2.js":
/*!********************************!*\
  !*** ./src/editor/editorv2.js ***!
  \********************************/
/***/ ((module) => {

class editorManager {

   
    constructor() {
        this.editor = CodeMirror.fromTextArea(document.getElementById("editor"),
            {
                mode: "text/x-c++src",
                theme: "vscode-dark",
                lineNumbers: true,
                lineSeparator: "\n",
                readOnly: false,     //It is read only to allow edits using only program commands. 
                extraKeys: {
                    "Ctrl-A": selectAll,
                },
                historyEventDelay:1 //Interval between edits that would register an input to the 

            })
        function selectAll() 
        {
            //console.log("Hi")
        }
    }
    get instance() {
        return this.editor;
    }
    localEdit(changeObject) {

        console.log(changeObject);


        this.operations = [];
        
        this.options = "";
        if (changeObject.origin != "setValue" && (changeObject.origin) != undefined)// I might change this line later
        {
            this.options = "normal_op";
            let value= "", type = "";

            let select_start_index = 0, select_end_index = 0, num_selected_chars = 0;

            let current_cursor_position = this.editor.getCursor();
            let current_cursor_index = this.editor.indexFromPos(current_cursor_position); window.current_cursor_index = current_cursor_index;// this line for debegg
            let selection_made = false;

            if (changeObject.from.sticky == "after" || changeObject.from.sticky == "before") {


                select_start_index = this.editor.indexFromPos(changeObject.from);
                select_end_index = this.editor.indexFromPos(changeObject.to);
                num_selected_chars = Math.abs(select_end_index - select_start_index);



                if (num_selected_chars) {
                    console.log("A selection operation is made");
                    console.log(`Starting position ${select_start_index}`);
                    console.log(`Ending positiong ${select_end_index}`);
                    console.log(`Number of selected chars ${num_selected_chars}`);
                    selection_made = true;
                }

            }

            if (!selection_made) {
                select_start_index = current_cursor_index;
                select_end_index = current_cursor_index - 1;
                num_selected_chars = 1;
            }



            if (changeObject.origin === "+delete" || changeObject.origin === "cut") {
                type = "delete";
                if (selection_made)
                    this.removeRange(select_start_index, num_selected_chars);
                else
                    this.removeRange(--current_cursor_index, num_selected_chars);

            }
            else if (changeObject.origin === "+input") {
                if (selection_made)
                {

                    this.removeRange(select_start_index, num_selected_chars);
                    console.log("Selection start")
                    console.log(select_start_index);
                    console.log("Selection end")
                    console.log(select_end_index);
                    current_cursor_index = this.editor.indexFromPos(this.editor.getCursor());
                }

                type = "insert";

                if (changeObject.text.length == 2 && changeObject.text[0] === "")
                    value = "\n";
                else value = changeObject.text[0];

                this.operations.push({ type, value, index: current_cursor_index, number:1});

            }
            else if (changeObject.origin === "paste") 
            {
                
                if (selection_made)
                this.removeRange(select_start_index, num_selected_chars);
                
                type = "insert";
                let count = select_start_index;

                for (let i = 0; i < changeObject.text.length; i++) {

    
                        this.operations.push({ type, value: changeObject.text[i], index: count, number:changeObject.text[i].length });
                        count= count + changeObject.text[i].length;

                    if (changeObject.text.length > 0 && (i + 1 != changeObject.text.length)) {
                        this.operations.push({ type, value: "\n", index: count,number:1});
                        count++;
                    }
                }
            }
            else if (changeObject.origin ==="undo")
            {
               this.options = "undo";
            }
            else if(changeObject === "redo")
            {
                this.options = "redo";
            }
            
        }
        


        return [this.operations,this.options];

        
    }
    removeRange(delete_index, num_selected_chars) {
     
            let deleted_text = this.editor.getRange(this.getPosFromIndex(delete_index),this.getPosFromIndex(delete_index+num_selected_chars));
            this.operations.push({ type: "delete", value:deleted_text, index: delete_index,number:num_selected_chars })
            this.editor.setCursor(this.getPosFromIndex(delete_index));
    }

    permitEdit() {
        this.editor.setOption("readOnly", false)
    }
    changeText(text) {
        this.editor.setValue(text)
    }
    getCursor() {
        return this.editor.getCursor();
    }
    setCursor(cursor_pos) {
        this.editor.setCursor(cursor_pos);
    }
    getPosFromIndex(index) {
        return this.editor.posFromIndex(index)
    }
    getIndexFromPos(pos)
    {
        return this.editor.indexFromPos(pos);
    }
    addCharsToIndex(value, index) {
        this.editor.replaceRange(value, this.editor.posFromIndex(index));
    }
    clearHistory()
    {
        this.editor.clearHistory();
    }

}

module.exports = editorManager;


/***/ }),

/***/ "./src/ui.js":
/*!*******************!*\
  !*** ./src/ui.js ***!
  \*******************/
/***/ ((module) => {


 function loadDOM(createRoom,joinRoom,File1,File2)
{
    document.querySelector("#createRoom").addEventListener("click",createRoom)
    document.querySelector("#joinRoom").addEventListener("click",joinRoom)
    document.querySelector("#File1").addEventListener("click",File1)
    document.querySelector("#File2").addEventListener("click",File2)

    document.querySelector("#copyRoomId").addEventListener("click",copyRoomId)
    document.querySelector("#pasteRoomId").addEventListener("click",pasteRoomId)
}

 function showCopyButton()
{
    document.getElementById("copyRoomId").style.visibility = "visible";
}
 function getRoomId()
{
    return document.getElementById("otherRoomId").value;
}
 function copyRoomId()
{
    navigator.clipboard.writeText(document.getElementById("roomId").innerHTML);
}
 function pasteRoomId()
{
    navigator.clipboard.readText().then((data)=>{document.getElementById("otherRoomId").innerHTML=data});
}

 function displayOnJoin(currentSocketId,currentRoomId)
{
    console.log("You succsefully joined the room! Mabrook")
    console.log("Your socket with ID "+currentSocketId+" joined room with ID "+currentRoomId)
    document.getElementById("currentRoom").innerHTML= "Your current room number is "
    document.getElementById("roomId").innerHTML= currentRoomId;
    
}

 function displayOnNewUser(socketId,roomId)
{
console.log("Socket with ID "+socketId+" joined current room with ID "+roomId)
}

module.exports = {
    loadDOM,
    showCopyButton,
    getRoomId,
    pasteRoomId,
    displayOnJoin,
    displayOnNewUser,
}

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/node module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.nmd = (module) => {
/******/ 			module.paths = [];
/******/ 			if (!module.children) module.children = [];
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
const connctionManager = __webpack_require__(/*! ./client/connection.js */ "./src/client/connection.js");
const roomManager = __webpack_require__(/*! ./client/rooms.js */ "./src/client/rooms.js");
const UI = __webpack_require__(/*! ./ui.js */ "./src/ui.js");
const editorManager = __webpack_require__(/*! ./editor/editorv2.js */ "./src/editor/editorv2.js")
const LSeqTree = __webpack_require__(/*! lseqtree */ "./node_modules/lseqtree/lib/lseqtree.js");

let editor_manager = new editorManager();
window.editor_manager = editor_manager;
let op_history = [];
let undo_ptr = -1; let redo_ptr =-1;

window.op_history = op_history;


UI.loadDOM(createRoom, joinRoom, File1, File2);

let connection, currentSocketId = undefined;
(async function establishConnection() {
    [connection, currentSocketId] = await connctionManager.connect();
    setListeners();
})();


let currentRoomId = undefined;
async function createRoom() {
    currentRoomId = await roomManager.create(connection)
    UI.displayOnJoin(currentSocketId, currentRoomId);
    UI.showCopyButton();
}

async function joinRoom() {

    currentRoomId = UI.getRoomId();
    if (currentRoomId && currentSocketId) {

        let isConnected = await roomManager.join(connection, currentRoomId);
        if (isConnected) UI.displayOnJoin(currentSocketId, currentRoomId);

    }
}

function setListeners() {

    connection.socket.on("new-user-is-connected", (socketId, roomId) => { if (currentRoomId == roomId) UI.displayOnNewUser(socketId, roomId) })    // ONLY USED FOR DEBUGGING 

    connection.socket.on("file-is-read", (data) => { initializeLSEQ(data) })

    connection.socket.on("changes-saved", () => { console.log("Your changes are saved") })

    editor_manager.instance.on("beforeChange", (instance, changeObject) => {
        if (currentSocketId && currentRoomId);
        localChange(changeObject);
    })
    // editor_manager.instance.on("keyHandled",(instance,value,event)=>
    // {
    //     console.log(value)
    //     if(value==="Ctrl-A")
    //     {   
    //         // editor_manager.instance.focus();
    //         // let pos = instance.getCursor();
    //         // editor_manager.instance.setSelection(pos);

    //         //let test = editor_manager.instance.getInputField();
    //         // test.dispatchEvent(new KeyboardEvent('keydown', {'key':'Shift'} ));
    //         // test.dispatchEvent(new KeyboardEvent('keydown', {'key':'Left'} ));
    //         // test.dispatchEvent(new KeyboardEvent( 'keyup' , {'key':'Left'} )); //To mimic keypress 
    //         // test.dispatchEvent(new KeyboardEvent( 'keyup' , {'key':'Shift'} )); //To mimic keypress 
    //         //editor_manager.instance.execCommand("selectAll")
    //         // editor_manager.instance.setSelection({line:0,ch:0})
          

    //         // editor_manager.instance.setExtending(true);
    //         // editor_manager.instance.extendSelection({line:0,ch:0},{line:0,ch:1});
    
    //     }
            

    // })
    // editor_manager.instance.on("electricInput",(instance,changeObject)=>{
    //     console.log(changeObject)
    // })
    connection.onmessage = function (event) {
        remoteChange(event.data)
    }
}
function localChange(changeObject) {

    let [operations, options] = editor_manager.localEdit(changeObject);

    if (options == "normal_op") {
        for (let operation of operations) {
            operation["data"] = [];
            if (operation.type === "insert") {
                let insert_index = operation.index;
                for (let i = 0; i < operation.value.length; i++) {
                    let data = lseq_client.insert(operation.value[i], insert_index++);
                    operation.data.push(data);
                }
                delete operation.value;
            }
            else if (operation.type === "delete") {
                let delete_index = operation.index;
                let num_of_deletions = operation.number;
                for (let i = 0; i < num_of_deletions; i++) {
                    let data_id = lseq_client.remove(delete_index);
                    operation.data.push({ elem: operation.value[i], id: data_id });
                }
                delete operation.value
            }

        }

        if(op_history.length+1>200)
        {
            op_history.shift();
            undo_ptr--;
            redo_ptr--;

        }
        
        op_history.push(operations);
         undo_ptr=   op_history.length-1;
        console.log(op_history);
        

    }
    else if (options === "undo") {
      if(op_history.length)
      {
        if(undo_ptr!=-1)
        {
            
            let recent_operations = op_history[undo_ptr];
            undoChanges(recent_operations,operations);
                    redo_ptr=undo_ptr;
            undo_ptr--;

        }
      }
    }
    else if (options === "redo") {
        if (op_history.length) 
        {
            if(redo_ptr!=-1&& redo_ptr<op_history.length)
            {
                let recent_operations = op_history[redo_ptr];
                redoChanges(recent_operations,operations);
                undo_ptr=redo_ptr;
                redo_ptr++;

            }
       

        }

    }
    if (options) 
    broadcastToEveryone(file_name, operations);
    

}
function undoChanges(recent_operations,operations)
{
    for (let operation of recent_operations) {
        if (operation.type === "insert") {

            for (let data_item of operation.data)
                lseq_client.applyRemove(data_item.id);

            operations.push({ type: "delete", data: operation.data });

        }
        else if (operation.type === "delete") {

            let new_data = [];

            for (let data_item of operation.data) {
                let deleted_text = data_item.elem;
                for (let char of deleted_text) {
                    new_data.push({ elem: char, id: data_item.id });
                    lseq_client.applyInsert(new_data.at(-1));
                }
            }
            operations.push({ type: "insert", data: new_data });
        }
    
    }
}

function redoChanges(recent_operations,operations)
{
    for (let operation of recent_operations) {
        if (operation.type === "insert") {

            let new_data = [];
    
            for (let data_item of operation.data) {
                let deleted_text = data_item.elem;
                for (let char of deleted_text) {
                    new_data.push({ elem: char, id: data_item.id });
                    lseq_client.applyInsert(new_data.at(-1));
                }
            }
            operations.push({ type: "insert", data: new_data });
            
        }
        else if (operation.type === "delete") {
            for (let data_item of operation.data)
                lseq_client.applyRemove(data_item.id);
    
    
            operations.push({ type: "delete", data: operation.data });

        }
    
    }
}
function broadcastToEveryone(file_name, operations) {
    connection.send({ file_name, operations }); //Sending the edit details to all peers.
    connection.socket.emit("edit-made", file_name, operations); //Sending the change details to the server.
}
function remoteChange(received) {
    if (file_name == received.file_name)  //If current open file is the same as the one that received a change, then the remote update should be applied.
    {
      
        


        let old_cursor_pos = editor_manager.getCursor();
        const start = performance.now();

        for (let operation of received.operations) {
            if (operation.type === "insert") {
                for (let data_item of operation.data) {
                    lseq_client.applyInsert(data_item);
                }
            }
            else if (operation.type === "delete") {
                for (let data_item of operation.data) {
                    lseq_client.applyRemove(data_item.id);
                }
            }

        }

        const duration = performance.now() - start;
        console.log(duration);
        editor_manager.changeText(lseq_client.traverse());
        editor_manager.setCursor(old_cursor_pos);

        if(op_history.length+1>200)
        { op_history.shift();
            if(redo_ptr>=200)
            redo_ptr--;
        }
       

        op_history.push(received.operations);

    }



}
let file_name = "";
function File1() {
    if (currentRoomId != undefined && file_name != "file1") {
        file_name = "file1";
        connection.socket.emit("read-file", file_name) //should emit file.name extension later on
        editor_manager.permitEdit();
        op_history = [];
        undo_ptr=-1;
        redo_ptr=-1;
    }
}
function File2() {
    if (currentRoomId != undefined && file_name != "file2") {
        file_name = "file2";
        connection.socket.emit("read-file", file_name) //should emit file.name extension later on
        editor_manager.permitEdit();
        op_history=[];
        undo_ptr=-1;
        redo_ptr=-1;
    }
}

lseq_client = new LSeqTree(50000);
function initializeLSEQ(data) {
    lseq_client = (new LSeqTree(0)).fromJSON(JSON.parse(data));

    let text = lseq_client.traverse();
    editor_manager.changeText(text);

    editor_manager.clearHistory();
}


})();

/******/ })()
;