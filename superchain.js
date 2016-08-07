'use strict';

function Superchain() {
  this.chain = [];
  this.ctx = {};
}

/**
 * Adds a new item to the chain
 * @param {function} fn Chain item
 * @chainable
 * @returns {object} Returns `this` value
 */
Superchain.prototype.add = function (fn) {
  this.chain.push(fn);
  return this;
};

/**
 * Calls chain and returns a promise
 * @param  {Function} fn Success function
 * @returns {object} Returns a promise
 */
Superchain.prototype.then = function (fn) {
  return new Promise((resolve, reject) => {
    let res = [];
    let next = () => {
      let job = this.chain.shift();
      if (!job) {
        resolve(res);
        return;
      }

      try {
        let result;
        if (typeof job === 'function') {
          result = job.call(this.ctx);
        }
        else {
          result = job;
        }

        if (result.then && result.catch) {
          result.then(data => {
            res.push(data);
            next();
          })
          .catch(err => {
            reject(err);
          });

          return;
        }

        res.push(result);
        next();
      }
      catch(err) {
        reject(err);
      }
    };

    next();
  }).then(fn);
};

module.exports = {
  add: function(fn) {
    let superchain = new Superchain();
    superchain.add(fn);
    return superchain;
  }
};