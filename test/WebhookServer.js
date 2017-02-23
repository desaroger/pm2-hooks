/**
 * Created by desaroger on 23/02/17.
 */

let {expect} = require('./assets');
let WebhookServer = require('../src/WebhookServer');

describe('webhookServer', () => {

	it('is a function', () => {
		expect(WebhookServer).to.be.a('function');
	});

	it('can be instantiated', () => {
	    expect(() => new WebhookServer()).to.not.throw();
	});

});
