module.exports = class Abstract {
  constructor (model) {
    this.id;
    this.instance;
    this.model = model;
    this.createdAt = now;
    this.updatedAt = now;
    this.defaultWhere = { id: this.id };
  }

  clearClassToCreate (...customKey) {
    const { id, instance, defaultWhere, model, ...data } = this;
    customKey.forEach((key) => delete data[key]);
    return data;
  }

  async create () {
    const data = this.clearClassToCreate();
    this.id = (await this.model.create(data)).id;
    this.cache();
    return this;
  }
};