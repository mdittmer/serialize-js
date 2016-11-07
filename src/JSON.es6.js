/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
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
'use strict';

const _ = require('lodash');
const registryModule = require('./registry.es6.js');
const defaultRegistry = registryModule.registry;

function clone(o, Ctor) {
  const RealCtor = Ctor || o.constructor;
  console.assert(
    RealCtor.prototype.clone || RealCtor.prototype.init,
    `Expect cloneables to implement prototype.clone() or prototype.init()`
  );
  if (o.clone) return o.clone();
  const ret = new RealCtor();
  ret.init(o);
  return ret;
}

function fromJSON(json, registry, Ctor) {
  const type = typeof json;
  if (json === null || type === 'boolean' || type === 'string' ||
      type === 'function' || type === 'number')
    return json;

  const KEY = this.key_;

  if (Array.isArray(json)) {
    return json.map(datum => this.fromJSON(datum, registry, Ctor));
  } else if (json[KEY]) {
    const TypedCtor = (registry || defaultRegistry).lookup(json[KEY]) || Ctor;
    const values = this.fromJSON(_.omit(json, [KEY]), registry, TypedCtor);
    if (TypedCtor.fromJSON) return TypedCtor.fromJSON(values, registry);
    if (TypedCtor.prototype.init) return this.clone(json, TypedCtor);
    throw new Error(`Found constructor registered as "${json[KEY]}", but no ${json[KEY]}.fromJSON(json) or ${json[KEY]}.prototype.init(json)`);
  } else {
    return _.mapValues(json, value => this.fromJSON(value, registry, Ctor));
  }
}

function toJSON(o, registry) {
  const type = typeof o;
  if (o === null || type === 'boolean' || type === 'string' ||
      type === 'function' || type === 'number')
    return o;

  if (o.constructor === Object || o.constructor === Array) return _.clone(o);

  const Ctor = o.constructor;
  const actualRegistry = registry || defaultRegistry;
  if (!actualRegistry.lookup(Ctor.name)) actualRegistry.register(Ctor);
  else console.assert(actualRegistry.lookup(Ctor.name) === Ctor);

  if (o.toJSON) return o.toJSON(registry);

  let json = Ctor && Ctor.jsonKeys ? _.pick(o, Ctor.jsonKeys) : o;
  json = _.mapValues(json, value => this.toJSON(value, registry));

  if (Ctor === Object) return Object.assign({}, json);

  let defaults = {};
  defaults[this.key_] = Ctor.name;
  return Object.assign(defaults, json);
}

module.exports = {clone, fromJSON, toJSON, key_: 'class_'};
