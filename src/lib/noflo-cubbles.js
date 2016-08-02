(function(context) {
  var EventEmitter = context.EventEmitter;

  if (!EventEmitter) {
    throw Error("EventEmitter dependency not loaded");
  }

  var Graph = context.Graph = function(artifactId, options) {
    options = options || {};

    this.artifactId = artifactId ? artifactId : '';
    this.members = [];
    this.connections = [];
    this.inits = [];
    this.inslots = {};
    this.outslots = {};
    this.transaction = {
      id: null,
      depth: 0
    };
  };

  Graph.prototype = Object.create(EventEmitter);

  Graph.prototype.startTransaction = function(id, metadata) {
    if (this.transaction.id) {
      throw Error("Nested transactions are not supported");
    }

    this.transaction.id = id;
    this.transaction.depth = 1;
  }

  Graph.prototype.endTransaction = function(id, metadata) {
    if (!this.transaction.id) {
      throw Error("Attempted to end non-existing transaction");
    }
    this.transaction.id = null;
    this.transaction.depth = 0;
  }
  
  Graph.prototype.checkTransactionStart = function() {
    if (!this.transaction.id) {
      return this.startTransaction('inplicit');
    } else if (this.transaction.id === 'implicit') {
      return this.transaction.depth += 1;
    }
  }

  Graph.prototype.checkTransactionEnd = function() {
    if (this.transaction.id === 'implicit') {
      this.transaction.depth -= 1;
    }
    if (this.transaction.depth === 0) {
      return this.endTransaction('implicit');
    }
  }

  Graph.prototype.addMember = function(id, component, metadata) {
    var member;

    metadata = metadata || {};

    this.checkTransactionStart();

    member = {
      id: id,
      component: component,
      metadata: metadata
    };
    this.members.push(member);  

    this.checkTransactionEnd();

    return member;
  }
  
  Graph.prototype.addConnection = function(srcMember, srcSlot, dstMember, dstSlot, metadata) {
    var connection;

    metadata = metadata || {};

    // Check for duplicate connections
    connection = this.connections.find(function(conn) {
      return conn.source.memberIdRef === srcMember && conn.source.slot === srcSlot &&
        conn.destination.memberIdRef === dstMember && conn.destination.slot === dstSlot;
    });
    if (connection) {
      return;
    }

    this.checkTransactionStart();

    connection = {
      'source': {
        'memberIdRef': srcMember,
        'slot': srcSlot
      },
      'destination': {
        'memberIdRef': dstMember,
        'slot': dstSlot
      },
      'copyValue': (metadata.copyValue !== false),
      'repeatedValues': (metadata.repeatedValues === true),
      'hookFunction': metadata.hookFunction || '',
      'description': metadata.description || ''
    };
    this.connections.push(connection);

    this.checkTransactionEnd();
  }
  
  Graph.prototype.addInit = function(value, member, slot, metadata) {
    var iip;
    
    metadata = metadata || {};

    if (!this.getMember(member)) {
      return;
    }

    this.checkTransactionStart();

    iip = {
      'memberIdRef': member,
      'slot': slot,
      'value': value,
      'description': metadata.description || ''
    };
    this.inits.push(iip);

    this.checkTransactionEnd();

    return iip;
  }
  
  Graph.prototype.addSlot = function(id, direction, type, metadata) {

    metadata = metadata || {};

    this.checkTransactionStart();

    if (-1 !== direction.indexOf('input')) {
      this.inslots[id] = {
        'type': type,
        'metadata': metadata
      };
    }

    if (-1 !== direction.indexOf('output')) {
      this.outslots[id] = {
        'type': type,
        'metadata': metadata
      };
    }

    this.checkTransactionEnd();
  }
})(this);