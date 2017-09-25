'use strict'

const co = require('co-utils')

class Superchain {
  constructor (conf) {
    conf = conf || {}
    this.__chain = []
    this.__final = []
    this.thisContext = conf.thisContext || {}
    this.__subChains = new Map()
  }

  add (link) {
    if (typeof link !== 'function') {
      throw new TypeError(`Unsupported chain-link type. Only functions are allowed. Input value was ${this.getLinkType(link)}`)
    }

    this.__chain.push(link)
  }

  final (link) {
    if (typeof link !== 'function') {
      throw new TypeError(`Unsupported chain-link type. Only functions are allowed. Input value was ${this.getLinkType(link)}`)
    }

    this.__final.push(link)
  }

  when (condition) {
    if (this.__subChains.has(condition)) {
      return this.__subChains.get(condition)
    }

    const subchain = new Superchain({
      thisContext: this.thisContext
    })

    this.__subChains.set(condition, subchain)

    this.add(function conditionFn () {
      const args = Array.prototype.slice.call(arguments, 0, -2)
      const cont = condition.apply(this.thisContext, args)
      const next = arguments[arguments.length - 2]

      if (!cont) {
        return next()
      }

      const subCall = subchain.run.apply(subchain, args)
      subCall.then((data) => {
        next()
      }).catch((err) => {
        throw err
      })
    })

    return subchain
  }

  run (ctx) {
    const args = Array.prototype.slice.call(arguments)
    const thisContext = this.thisContext

    return new Promise((resolve, reject) => {
      const chain = [].concat(this.__chain, this.__final)

      let i = 0
      const next = () => {
        const fn = chain[i]
        if (!fn) return resolve(thisContext)
        i += 1
        try {
          if (fn.constructor.name === 'GeneratorFunction') {
            co(fn.bind.apply(fn, [thisContext].concat(args, [next]))).then((res) => {}).catch((err) => reject(err))
          } else if (fn.constructor.name === 'AsyncFunction') {
            fn.apply(thisContext, args.concat([next])).then((res) => {}).catch((err) => reject(err))
          } else {
            const finish = () => {
              return resolve(thisContext)
            }

            fn.apply(thisContext, args.concat([next, finish]))
          }
        } catch (err) {
          return reject(err)
        }
      }

      next()
    })
  }

  getLinkType (link) {
    const type = typeof link
    if (Array.isArray(link)) {
      return 'array'
    } else if (type === 'object' && link === null) {
      return 'null'
    }

    return type
  }
}

module.exports = Superchain
