'use strict';

// Core
const Fabric = require('../');

// Modules
const Service = require('../lib/service');

// Testing
const assert = require('assert');
// const expect = require('chai').expect;
const MerkleTree = require('merkletreejs');

// Data
const genesis = require('../data/fabric');
const message = require('../data/message');
const samples = require('../data/samples');

// Opcodes
const OPCODES = require('../data/opcodes');

// test our own expectations.  best of luck.
// TODO: write parser for comments
// Some of our GitHub Issues have tables and/or YAML — reading "frontmatter"
// from tables in documents should be standardized.
// @consensus:
// @quest:
describe('@fabric/core', function () {
  describe('Fabric', function () {
    it('should expose a constructor', function () {
      assert.equal(Fabric instanceof Function, true);
    });

    it('generates the correct, hard-coded genesis seed', async function provenance () {
      let seed = new Fabric.Vector(genesis['@data'])._sign();

      assert.equal(genesis['@id'], samples.names.fabric);
      assert.equal(seed['@id'], genesis['@id']);
    });

    it('can start and stop smoothly', function (done) {
      let fabric = new Fabric();

      async function main () {
        await fabric.start();
        await fabric.stop();
        done();
      }

      main();
    });
  });

  describe('Block', function () {
    it('is available from @fabric/core', function () {
      assert.equal(Fabric.Block instanceof Function, true);
    });
  });

  describe('Chain', function () {
    it('is available from @fabric/core', function () {
      assert.equal(Fabric.Chain instanceof Function, true);
    });

    it('can cleanly start and stop a chain', async function () {
      let chain = new Fabric.Chain();

      await chain.start();
      await chain.stop();

      assert.ok(chain);
      assert.ok(chain.ledger);
    });

    it('can append an arbitrary message', async function () {
      let chain = new Fabric.Chain();

      await chain.start();
      await chain.append({ debug: true, input: 'Hello, world.' });
      await chain.stop();

      console.log('[TEST]', '[CORE:CHAIN]', 'resulting chain:', chain);
      console.log('chain.ledger:', chain.ledger);
      console.log('chain:', chain.id);

      assert.ok(chain);
      assert.ok(chain.ledger);
    });
  });

  describe('Disk', function () {
    it('is available from @fabric/core', function () {
      assert.equal(Fabric.Disk instanceof Function, true);
    });
  });

  describe('Key', function () {
    it('is available from @fabric/core', function () {
      assert.equal(Fabric.Key instanceof Function, true);
    });

    it('can create an ECDSA key', function () {
      let key = new Fabric.Key();
      assert.ok(key);
    });

    it('can sign some data', function () {
      let key = new Fabric.Key();
      let signature = key._sign(message['@data']);

      assert.ok(signature);
    });

    it('produces a valid signature', function () {
      let key = new Fabric.Key();
      let signature = key._sign(message['@data']);
      let valid = key._verify(message['@data'], signature)
      assert.ok(valid);
    });
  });

  describe('Ledger', function () {
    it('is available from @fabric/core', function () {
      assert.equal(Fabric.Ledger instanceof Function, true);
    });

    it('can cleanly start and stop', async function () {
      let ledger = new Fabric.Ledger();

      await ledger.start();
      await ledger.stop();

      assert.ok(ledger);
    });

    it('can append an arbitrary message', async function () {
      let ledger = new Fabric.Ledger();

      await ledger.start();
      await ledger.append({ debug: true, input: 'Hello, world.' });
      await ledger.stop();

      assert.ok(ledger);
    });

    it('can append multiple arbitrary messages', async function () {
      let ledger = new Fabric.Ledger();

      await ledger.start();
      await ledger.append({ debug: true, input: 'Hello, world.' });
      await ledger.append({ debug: true, input: 'Why trust?  Verify.' });
      await ledger.stop();

      console.log('[TEST]', '[CORE:LEDGER]', 'resulting ledger id:', ledger['@id']);
      console.log('ledger.id:', ledger.id);
      console.log('ledger.pages:', ledger.pages);

      assert.ok(ledger);
    });

    it('generates a merkle tree with the expected proof of inclusion', async function () {
      let ledger = new Fabric.Ledger();

      await ledger.start();
      await ledger.append({ debug: true, input: 'Hello, world.' });
      await ledger.append({ debug: true, input: 'Why trust?  Verify.' });
      await ledger.stop();

      let sample = Fabric.Vector.fromObjectString(ledger.pages['@preimage']);
      let tree = new MerkleTree(sample, Fabric.sha256, { isBitcoinTree: true });
      let root = tree.getRoot();

      let proofs = {
        genesis: tree.getProof(sample[0], 0),
        'blocks/1': tree.getProof(sample[1], 1),
        'blocks/2': tree.getProof(sample[2], 2)
      };

      let verifiers = {
        genesis: tree.verify(proofs.genesis, sample[0], root),
        'blocks/1': tree.verify(proofs['blocks/1'], sample[1], root),
        'blocks/2': tree.verify(proofs['blocks/2'], sample[2], root),
        invalid: tree.verify(proofs['genesis'], Buffer.alloc(32), root)
      };

      assert.ok(ledger);
      assert.equal(sample.length, 3);
      assert.equal(sample[0].toString('hex'), '56083f882297623cde433a434db998b99ff47256abd69c3f58f8ce8ef7583ca3');
      assert.equal(sample[1].toString('hex'), '67822dac02f2c1ae1e202d8e75437eaede631861e60340b2fbb258cdb75780f3');
      assert.equal(sample[2].toString('hex'), 'a59402c14784e1be43b1adfc7832fa8c402dddf1ede7f7c29549d499b112444f');
      assert.equal(verifiers.genesis, true);
      assert.equal(verifiers['blocks/1'], true);
      assert.equal(verifiers['blocks/2'], true);
      assert.equal(verifiers.invalid, false);
    });
  });

  describe('Machine', function () {
    it('is available from @fabric/core', function () {
      assert.equal(Fabric.Machine instanceof Function, true);
    });

    it('can compute a value', async function prove () {
      // TODO: use Fabric itself
      let machine = new Fabric.Machine(false);

      // TODO: use Fabric instead of Fabric.Machine
      machine.define('OP_TRUE', OPCODES.OP_TRUE);

      // fabric.push('OP_TRUE');
      machine.script.push('OP_TRUE');

      await machine.start();
      await machine.compute();
      await machine.stop();

      assert.equal(machine.state.id, samples.names.stackWithSingleValidFrame);
      assert.equal(machine.state['@data'][0], true);
    });

    it('can correctly sum two values', async function prove () {
      let machine = new Fabric.Machine(false);

      machine.define('OP_ADD', OPCODES.OP_ADD);

      machine.script.push('1');
      machine.script.push('1');
      machine.script.push('OP_ADD');

      await machine.start();
      await machine.compute();
      await machine.stop();

      assert.equal(machine.state['@data'][0], 2);
    });

    it('can correctly sum three values', async function prove () {
      let machine = new Fabric.Machine(false);

      machine.define('OP_ADD', OPCODES.OP_ADD);

      machine.script.push('1');
      machine.script.push('1');
      machine.script.push('OP_ADD');
      machine.script.push('2');
      machine.script.push('OP_ADD');

      await machine.start();
      await machine.compute();
      await machine.stop();

      assert.equal(machine.state['@data'][0], 4);
    });
  });

  describe('Oracle', function () {
    it('is available from @fabric/core', function () {
      assert.equal(Fabric.Oracle instanceof Function, true);
    });

    it('can store and retrieve a blob', async function datastore () {
      let fabric = new Fabric({
        path: './data/test'
      });

      await fabric.start();

      let put = await fabric._SET('/assets/test', message['@data']);
      let get = await fabric._GET('/assets/test');

      await fabric.stop();

      console.log('put:', put);
      console.log('get:', get);

      assert.equal(put, put);
      assert.equal(get, message['@data']);
    });

    xit('can store and retrieve an object', async function datastore () {
      let fabric = new Fabric();

      await fabric.start();

      let put = await fabric._SET('/assets/genesis', genesis);
      let get = await fabric._GET('/assets/genesis');

      await fabric.stop();

      console.log('put:', put);
      console.log('get:', get);

      assert.equal(put, put);
      assert.equal(get, message['@data']);
    });
  });

  describe('Resource', function () {
    it('is available from @fabric/core', function () {
      assert.equal(Fabric.Resource instanceof Function, true);
    });
  });

  describe('Service', function () {
    it('should expose a constructor', function () {
      assert.equal(Service instanceof Function, true);
    });

    it('can create an instance', async function provenance () {
      let service = new Service({
        name: 'Test'
      });

      assert.ok(service);
    });

    it('can start offering service', function (done) {
      let service = new Service();

      async function main () {
        await service.start();
        await service.stop();
        assert.ok(service);
        done();
      }

      main();
    });
  });

  describe('Scribe', function () {
    it('is available from @fabric/core', function () {
      assert.equal(Fabric.Scribe instanceof Function, true);
    });
  });

  describe('Script', function () {
    it('is available from @fabric/core', function () {
      assert.equal(Fabric.Script instanceof Function, true);
    });
  });

  describe('Stack', function () {
    it('is available from @fabric/core', function () {
      assert.equal(Fabric.Stack instanceof Function, true);
    });

    it('can instantiate from a serialized state', function () {
      // TODO: migrate to Stack
      let stack = Fabric.Vector.fromObjectString('{ "0": { "type": "Buffer", "data": [0, 0, 0, 0 ] } }');
      assert.equal(stack instanceof Array, true);
      assert.equal(stack[0] instanceof Buffer, true);
      assert.equal(stack[0].toString('hex'), '00000000');
      assert.ok(stack);
    });

    it('can push an element onto the stack', function () {
      let stack = new Fabric.Stack();

      let one = stack.push('foo');
      let two = stack.push('bar');

      assert.equal(one, 1);
      assert.equal(two, 2);
      assert.equal(stack['@data'][1].toString('hex'), '5959238a604fd0492fe769bfd34ba7f77c481b73626106de6e7071fdb3f82290');
    });

    xit('mimics JavaScript semantics', function () {
      let stack = new Fabric.Stack();

      stack.push('foo');
      stack.push('bar');

      let last = stack.pop();

      assert.equal(last, 'bar');
    });
  });

  describe('State', function () {
    it('is available from @fabric/core', function () {
      assert.equal(Fabric.State instanceof Function, true);
    });
  });

  describe('Store', function () {
    it('is available from @fabric/core', function () {
      assert.equal(Fabric.Store instanceof Function, true);
    });
  });

  describe('Transaction', function () {
    it('is available from @fabric/core', function () {
      assert.equal(Fabric.Transaction instanceof Function, true);
    });
  });

  describe('Vector', function () {
    it('is available from @fabric/core', function () {
      assert.equal(Fabric.Vector instanceof Function, true);
    });

    it('can restore from garbage', async function () {
      let vector = Fabric.Vector.fromObjectString('{ "0": { "type": "Buffer", "data": [0, 0, 0, 0 ] } }');
      assert.equal(vector instanceof Array, true);
      assert.equal(vector[0] instanceof Buffer, true);
      assert.equal(vector[0].toString('hex'), '00000000');
      assert.ok(vector);
    });
  });

  describe('Worker', function () {
    it('is available from @fabric/core', function () {
      assert.equal(Fabric.Worker instanceof Function, true);
    });
  });
});
