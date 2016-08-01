import {EventEmitter} from 'events';

class Graph extends EventEmitter {
  name: '',
  caseSensitive: false,
  properties: {},
  nodes: [],
  edges: [],
  initializers: [],
  exports: [],
  inports: {},
  outports: {},
  groups: [],
  transaction: {
    id: null,
    depth: 0
  },

  constructor(name, options) {
    this.name = name;
    this.caseSensitive = options.caseSensitive || false;
  },

  getPortName(port) {
    return (this.caseSensitive) ? port : port.toLowerCase();
  },

  /**
   * Group graph changes into transactions
   *
   * If no transaction is explicitly opened, each call
   * to the graph API will implicitly create a transaction
   * for that change.
   */
  startTransaction(id, metadata) {
    if (this.transaction.id) {
      throw Error("Nested transactions are not supported");
    }

    this.transaction.id = id;
    this.transaction.depth = 1;
    this.emit('startTransaction', id, metadata);
  },

  endTransaction(id, metadata) {
    if (!this.transaction.id) {
      throw Error("Attempted to end non-existing transaction");
    }

    this.transaction.id = null;
    this.transaction.depth = 0;
    this.emit('endTransaction', id, metadata);
  },

  checkTransactionStart() {
    if (!this.transaction.id) {
      this.startTransaction('implicit');
    } else if (this.transaction.id === 'implicit') {
      this.transaction.depth++;
    }
  },

  checkTransactionEnd() {
    if (this.transaction.id === 'implicit') {
      this.transaction.depth--;
    }

    if (this.transaction.depth === 0) {
      this.endTransaction('implicit');
    }
  },

  /**
   * Modifying Graph properties
   * 
   * This method changes properties of the graph.
   */
  setProperties(properties) {
    this.checkTransactionStart();
    var before = Object.assign({}, properties);
    Object.keys(properties).forEach(forEach(property) {
      this.properties[property] = properties[property];
    }, this);
    this.emit('changeProperties', this.properties, before);
    this.checkTransactionEnd();
  },

   /**
    * Exporting a port from the subgraph
    *
    * This allows subgraphs to expose a cleaner API by having reasonably
    * named ports shown instead of all the free ports of the graph.
    *
    * The ports exported using this way are ambiguous in their direciton. Use
    * `addInport` or `addOutport` instead to disambiguate.
    */
  addExport(publicPort, nodeKey, portKey, metadata) {
    var exported;

    metadata = metadata || { x: 0, y: 0 };

    // Check that the node exists
    if (!this.getNode(nodeKey)) {
      return;
    }

    this.checkTransactionStart();

    exported = {
      'public': this.getPortName(publicPort),
      'process': nodeKey,
      'port': this.getPortName(portKey),
      'metadata': metadata
    };

    this.exports.push(exported);
    this.emit('addExport', exported);

    this.checkTransactionEnd();
  },

  removeExport(publicPort) {
    var exported;

    publicPort = this.getPortName(publicPort);

    exported = this.exports.findIndex(exported => exported.public === publicPort);

    if (!exported) { return; }

    this.checkTransactionStart();

    this.exports.splice(this.exports.indexOf(exported), 1);
    this.emit('removeExport', exported);

    this.checkTransactionEnd();
  },

  addInport(publicPort, nodeKey, portKey, metadata) {
    // Check that the node exists
    if (!this.getNode(nodeKey)) { return; }

    publicPort = this.getPortName(publicPort);

    this.checkTransactionStart();

    this.inports[publicPort] = {
      'process': nodeKey,
      'port': this.getPortName(portKey),
      'metadata': metadata
    };
    this.emit('addInport', publicPort, this.inports[publicPort]);

    this.checkTransactionEnd();
  },

  removeInport(publicPort) {
    publicPort = this.getPortName(publicPort);

    // Check that the node exists
    var port = this.inports[publicPort];
    if (!port) { return; }

    this.checkTransactionStart();

    this.setInportMetadata(publicPort, {});
    delete this.inports[publicPort];
    this.emit('removeInport', publicPort, port);

    this.checkTransactionEnd();
  },

  renameInport(oldPort, newPort) {
    oldPort = this.getPortName(oldPort);
    newPort = this.getPortName(newPort);

    if (!this.inports[oldPort]) { return; }

    this.checkTransactionStart();

    this.inports[newPort] = this.inports[oldPort];
    delete this.inports[oldPort];
    this.emit('renameInport', oldPort, newPort);

    this.checkTransactionEnd();
  },

  setInportMetadata(publicPort, metadata) {
    var before;

    publicPort = this.getPortName(publicPort);

    if (!this.inports[publicPort]) { return; }

    this.checkTransactionStart();

    before = Object.assign({}, this.inports[publicPort].metadata);
    this.inports[publicPort].metadata = this.inports[publicPort].metadata || {};
    Object.keys(metadata).forEach(item => {
      if (metadata[item]) {
        this.inports[publicPort].metadata[item] = metadata[item];
      } else {
        delete inports[publicPort].metadata[item];
      }
    }, this);
    this.emit('changeInport', publicPort, this.inports[publicPort], before);

    this.checkTransactionEnd();
  },

  addOutport(publicPort, nodeKey, portKey, metadata) {
    // Check that the node exists
    if (!this.getNode(nodeKey)) { return; }

    publicPort = this.getPortName(publicPort);

    this.checkTransactionStart();

    this.outports[publicPort] = {
      'process': nodeKey,
      'port': this.getPortName(portKey),
      'metadata': metadata
    };
    this.emit('addOutport', publicPort, this.outports[publicPort]);

    this.checkTransactionEnd();
  },

  removeOutport(publicPort) {
    publicPort = this.getPortName(publicPort);

    // Check that the node exists
    var port = this.outports[publicPort];
    if (!port) { return; }

    this.checkTransactionStart();

    this.setOutportMetadata(publicPort, {});
    delete this.outports[publicPort];
    this.emit('removeOutport', publicPort, port);

    this.checkTransactionEnd();
  },

  renameOutport(oldPort, newPort) {
    oldPort = this.getPortName(oldPort);
    newPort = this.getPortName(newPort);

    if (!this.outports[oldPort]) { return; }

    this.checkTransactionStart();

    this.outports[newPort] = this.outports[oldPort];
    delete this.outports[oldPort];
    this.emit('renameOutport', oldPort, newPort);

    this.checkTransactionEnd();
  },

  setOutportMetadata(publicPort, metadata) {
    var before;

    publicPort = this.getPortName(publicPort);

    if (!this.outports[publicPort]) { return; }

    this.checkTransactionStart();

    before = Object.assign({}, this.outports[publicPort].metadata);
    this.outports[publicPort].metadata = this.outports[publicPort].metadata || {};
    Object.keys(metadata).forEach(item => {
      if (metadata[item]) {
        this.outports[publicPort].metadata[item] = metadata[item];
      } else {
        delete outports[publicPort].metadata[item];
      }
    }, this);
    this.emit('changeOutport', publicPort, this.outports[publicPort], before);

    this.checkTransactionEnd();
  },

  /**
   * Grouping nodes in a graph
   */
  addGroup(group, nodes, metadata) {
    var g;

    this.checkTransactionStart();

    g = {
      'name': group,
      'nodes': nodes,
      'metadata': metadata
    };
    this.groups.push(g);
    this.emit('addGroup', g);

    this.checkTransactionEnd();
  },

  renameGroup(oldName, newName) {
    this.checkTransactionStart();

    this.groups.find(g => g.name === oldName).name = newName;
    this.emit('renameGroup', oldName, newName);

    this.checkTransactionEnd();
  },

  removeGroup(groupName) {
    var group;

    this.checkTransactionStart();

    group = this.groups.find(g => g.name === groupName);
    if (!group) { return; }
    this.setGroupMetadata(group.name, {});
    this.groups.splice(this.groups.indexOf(group), 1);
    this.emit('removeGroup', group)

    this.checkTransactionEnd();
  },

  setGroupMetadata(groupName, metadata) {
    var group, before;

    this.checkTransactionStart();

    group = this.groups.find(g => g.name === groupName);
    if (!group) { return; }
    before = Object.assign({}, group);
    Object.keys(metadata).forEach(item => {
      if (metadata[item]) {
        group.metadata[item] = metadata[item];
      } else {
        delete group.metadata[item];
      }
    });
    this.emit('changeGroup', group, before);

    this.checkTransactionEnd();
  },

  /**
   * Adding a node to the graph
   *
   * Nodes are identified by an ID unique to the graph.
   * Additionally, a node may contain information on what
   * NoFlo component it is and possibly display coordinages.
   */
  addNode(id, component, metadata) {
    var node;

    this.checkTransactionStart();

    metadata = metadata || {};

    node = {
      'id': id,
      'component': component,
      'metadata': metadata
    };
    this.nodes.push(node);
    this.emit('addNode', node);

    this.checkTransactionEnd();

    return node;
  },

  /**
   * Removing a node from the graph
   *
   * Existing nodes can be removed from a graph by their ID. This
   * will remove the node and also remove all edges connected to it.
   */
  removeNode(id) {
    var node, index;

    node = this.getNode(id);
    if (!node) { return; }

    this.edges.filter(edge => edge.from.node === node.id || edge.to.node === node.id)
      .forEach(edge => this.removeEdge(edge.from.node, edge.from.port, edge.to.node, edge.to.port));

    this.initializers.filter(iip => iip.to.node === node.id)
      .forEach(iip => this.removeInitial(iip.to.node, iip.to.port));

    this.exports.filter(exported => this.getPortName(id) === exported.process)
      .forEach(exported => this.removeExport(exported.public));

    Object.keys(this.inports).filter(pub => this.inports[pub].process === id)
      .forEach(this.removeInport);

    Object.keys(this.outports).filter(pub => this.outports[pub].process === id)
      .forEach(this.removeOutport);

    this.groups.forEach(group => {
      index = group.nodes.indexOf(id);
      if (-1 === index) { return; }
      group.nodes.splice(index, 1);
    });

    this.setInportMetadata(id, {});

    if (-1 !== this.nodes.indexOf(node)) {
      this.nodes.splice(this.nodes.indexOf(node), 1);
    }

    this.emit('removeNode', node);

    this.checkTransactionEnd();
  },

  getNode(id) {
    return this.nodes.find(node => node.id === id);
  },

  renameNode(oldId, newId) {
    var node;

    this.checkTransactionStart();

    node = this.getNode(oldId);
    if (!node) { return; }
    node.id = newId;

    this.edges.filter(edge => edge.from.node === oldId).forEach(edge => edge.from.node = newId);
    this.edges.filter(edge => edge.to.node === oldId).forEach(edge => edge.to.node = newId);

    this.initializer.filter(iip => iip.to.node === oldId).forEach(iip => iip.to.node = newId);

    this.exports.filter(exported => exported.process === oldId).forEach(exported => exported.process = newId);

    Object.keys(this.inports).forEach(pub => {
      if (this.inports[pub].process === oldId) {
        this.inports[pub].process = newId;
      }
    });

    Object.keys(this.outports).forEach(pub => {
      if (this.outports[pub].process === oldId) {
        this.outports[pub].process = newId;
      }
    });

    this.groups.forEach(group => {
      if (-1 !== group.nodes.indexOf(oldId)) {
        group.nodes[group.nodes.indexOf(oldId)] = newId;
      }
    });

    this.emit('renameNode', oldId, newId);

    this.checkTransactionEnd();
  },

  setNodeMetadata(id, metadata) {
    var node, before;
    node = this.getNode(id);
    if (!node) { return; }

    this.checkTransactionStart();

    before = Object.assign({}, node);
    node.metadata = node.metadata || {};

    Object.keys(metadata).forEach(item => {
      if (metadata[item]) {
        node.metadata[item] = metadata[item];
      } else {
        delete node.metadata[item];
      }
    });

    this.emit('changeNode', node, before);

    this.checkTransactionEnd();
  },

  /**
   * Connecting nodes
   * 
   * Nodes can be connected by adding edges between a node's outport
   * and another node's inport.
   */
  addEdge(outNode, outPort, inNode, inPort, metadata) {
    var edge;

    metadata = metadata || {};
    outPort = this.getPortName(outPort);
    inPort = this.getPortName(inPort);

    // Don't add duplicate edges
    edge = this.edges.find(edge => edge.from.node === outNode && edge.from.port === outPort && edge.to.node === inNode && edge.to.port === inPort);
    if (edge) { return; }
    if (!this.getNode(outNode) || !this.getNode(inNode)) { return; }

    this.checkTransactionStart();

    edge = {
      'from': {
        'node': outNode,
        'port': outPort
      },
      'to': {
        'node': inNode,
        'port': inPort
      },
      'metadata': metadata
    };
    this.edges.push(edge);
    this.emit('addEdge', edge);

    this.checkTransactionEnd();

    return edge;
  },

  addEdgeIndex(outNode, outPort, outIndex, inNode, inPort, inIndex, metadata) {
    var edge;

    metadata = metadata || {};

    if (!this.getNode(outNode) || !this.getNode(inNode)) { return; }

    outPort = this.getPortName(outPort);
    inPort = this.getPortName(inPort);

    inIndex = (index !== null) ? inIndex : undefined;
    outIndex = (index !== null) ? outIndex : undefined;

    this.checkTransactionStart();

    edge = {
      'from': {
        'node': outNode,
        'port': outPort,
        'index': outIndex
      },
      'to': {
        'node': inNode,
        'port': inPort,
        'index': inIndex
      },
      'metadata': metadata
    };
    this.edges.push(edge);
    this.emit('addEdge', edge);

    this.checkTransactionEnd();

    return edge;
  },

  removeEdge(node, port, node2, node2) {
    var toRemove, toKeep;

    this.checkTransactionStart();

    port = this.getPortName(port);
    node2 = this.getPortName(node2);

    toRemove = [];
    toKeep = [];
    if (node2 && node2) {
      this.edges.forEach(edge => {
        if (edge.from.node === node && edge.from.port === port && edge.to.node === node2 && edge.to.port === port2) {
          this.setEdgeMetadata(edge.from.node, edge.from.port, edge.to.node, edge.to.port, {});
          toRemove.push(edge);
        } else {
          toKeep.push(edge);
        }
      });
    } else {
      this.edges.forEach(edge => {
        if ((edge.from.node === node && edge.from.port === port) || (edge.to.node === node && edge.to.port === port)) {
          this.setEdgeMetadata(edge.from.node, edge.from.port, edge.to.node, edge.to.port, {});
          toRemove.push(edge);
        } else {
          toKeep.push(edge);
        }
      });
    }

    this.edges = toKeep;
    toRemove.forEach(this.emit.bind(this, 'removeEdge'));

    this.checkTransactionEnd();
  },

  getEdge(node, port, node2, port2) {
    port = this.getPortName(port);
    port2 = this.getPortName(port2);

    return this.edges.find(edge => edge.from.node === node && edge.from.port === port &&
      edge.to.node === node2 && edge.to.port === port2);
  },

  setEdgeMetadata(node, port, node2, port2, metadata) {
    var edge, before;

    edge = this.getEdge(node, port, node2, port2);
    if (!edge) { return; }

    this.checkTransactionStart();

    before = Object.assign({}, edge.metadata);
    edge.metadata = edge.metadata || {};

    Object.keys(metadata).forEach(item => {
      if (metadata[item]) {
        edge.metadata[item] = metadata[item];
      } else {
        delete edge.metadata[item];
      }
    });

    this.emit('changeEdge', edge, before);

    this.checkTransactionEnd();
  }
}