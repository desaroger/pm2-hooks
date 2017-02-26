/**
 * Created by desaroger on 23/02/17.
 */

let sinon = require('sinon');
let { expect, c, callApi, log } = require('./assets');
let WebhookServer = require('../src/WebhookServer');

describe('webhookServer', () => {
    it('is a function', () => {
        expect(WebhookServer).to.be.a('function');
    });

    it('can be instantiated', () => {
        expect(() => new WebhookServer()).to.not.throw();
    });

    describe('the instance', (whs, calls = 0) => {
        before(() => {
            whs = new WebhookServer({
                port: 1234,
                routes: {
                    demo: {
                        type: 'github',
                        method() {
                            calls++;
                        }
                    }
                }
            });
        });
        afterEach(() => whs.stop());

        it('not has the server created', () => {
            expect(whs.server).to.not.be.ok;
        });

        it('has the expected methods', () => {
            expect(whs.isRunning).to.be.a('function');
            expect(whs.start).to.be.a('function');
            expect(whs.stop).to.be.a('function');
        });

        it('is not running initially', () => {
            expect(whs.isRunning()).to.equal(false);
        });

        it('can be started', () => {
            return expect(whs.start()).to.eventually.be.fulfilled;
        });

        it('shows as running', () => {
            return whs.start()
                .then(() => {
                    expect(whs.isRunning()).to.equal(true);
                });
        });
    });

    describe('call handler', (whs, calls = 0, method) => {
        before(() => {
            whs = new WebhookServer({
                port: 1234,
                routes: {
                    working: {
                        type: 'github',
                        method() { calls++; }
                    },
                    withoutType: {
                        method() { calls++; }
                    },
                    throwsError: {
                        method() {
                            throw new Error('Test error');
                        }
                    },
                    throwsString: {
                        method() {
                            throw 'Test throw string'; // eslint-disable-line no-throw-literal
                        }
                    },
                    checkPayload: {
                        method(...args) {
                            return method.call(this, ...args);
                        }
                    }
                }
            });
        });
        afterEach(() => {
            whs.stop();
            calls = 0;
            log.restore();
        });

        it('the server is actually listening', c(function* () {
            let spy = sinon.spy(whs, '_handleCall');
            yield whs.start();
            log.restore();

            // Logs
            log.mock((msg, status) => {
                expect(msg).to.match(/no route found on url/i);
                expect(status).to.equal(1);
            });
            yield callApi();
            log.mock((msg, status) => {
                expect(msg).to.match(/route "asd" not found/i);
                expect(status).to.equal(1);
            });
            yield callApi('/asd');

            expect(spy.calledTwice).to.equal(true);
            spy.restore();
            expect(log.count).to.equal(2);
        }));

        it('returns success if the route works', c(function* () {
            expect(calls).to.equal(0);
            yield whs.start();
            log.mock((msg, status) => {
                expect(msg).to.match(/route "working" was found/i);
                expect(status).to.equal(0);
            });
            let body = yield callApi('/working');
            expect(body).to.be.deep.equal({
                status: 'success',
                message: 'Route "working" was found',
                code: 0
            });
            expect(calls).to.equal(1);
            expect(log.count).to.equal(1);
        }));

        it('works even though there is no type', c(function* () {
            expect(calls).to.equal(0);
            yield whs.start();
            log.mock((msg, status) => {
                expect(msg).to.match(/route "withoutType" was found/i);
                expect(status).to.equal(0);
            });
            let body = yield callApi('/withoutType');
            expect(body).to.be.deep.equal({
                status: 'success',
                message: 'Route "withoutType" was found',
                code: 0
            });
            expect(calls).to.equal(1);
            expect(log.count).to.equal(1);
        }));

        it('returns a warning if called a non-existent route', c(function* () {
            expect(calls).to.equal(0);
            yield whs.start();
            log.mock((msg, status) => {
                expect(msg).to.match(/route "lol" not found/i);
                expect(status).to.equal(1);
            });
            let body = yield callApi('/lol');
            expect(body).to.be.deep.equal({
                status: 'warning',
                message: 'Route "lol" not found',
                code: 1
            });
            expect(calls).to.equal(0);
        }));

        it('returns an error if the method triggers an error', c(function* () {
            expect(calls).to.equal(0);
            yield whs.start();
            log.mock((msg, status) => {
                expect(msg).to.match(/route "throwsError" method error: Test error/i);
                expect(status).to.equal(2);
            });
            let body = yield callApi('/throwsError');
            expect(body).to.be.deep.equal({
                status: 'error',
                message: 'Route "throwsError" method error: Test error',
                code: 2
            });
            expect(calls).to.equal(0);
        }));

        it('returns an error if the method triggers a value', c(function* () {
            expect(calls).to.equal(0);
            yield whs.start();
            log.mock((msg, status) => {
                expect(msg).to.match(/route "throwsString" method error: Test throw string/i);
                expect(status).to.equal(2);
            });
            let body = yield callApi('/throwsString');
            expect(body).to.be.deep.equal({
                status: 'error',
                message: 'Route "throwsString" method error: Test throw string',
                code: 2
            });
            expect(calls).to.equal(0);
        }));

        it('pass the payload to the method', c(function* () {
            expect(calls).to.equal(0);
            yield whs.start();
            method = (payload) => {
                expect(payload).to.deep.equal({
                    name: 'pm2-hooks',
                    action: 'push',
                    branch: 'master'
                });
            };
            log.mock((msg, status) => {
                expect(msg).to.match(/route "checkPayload" was found/i);
                expect(status).to.equal(0);
            });
            let body = yield callApi('/checkPayload',
                {
                    name: 'test',
                    action: 'push',
                    branch: 'master'
                });
            expect(body).to.be.deep.equal({
                status: 'success',
                message: 'Route "checkPayload" was found',
                code: 0
            });
            expect(calls).to.equal(0);
        }));
    });

    describe('_getRouteName', (whs, spy, mockReq) => {
        before(() => {
            whs = new WebhookServer({
                port: 1234,
                routes: {
                    demo() {}
                }
            });
            spy = sinon.spy(whs.options.routes, 'demo');
            mockReq = (url) => {
                return {
                    url
                };
            };
        });

        it('returns null if there is no url', () => {
            let req = mockReq('');
            expect(whs._getRouteName(req)).to.equal(null);
            req = mockReq('/');
            expect(whs._getRouteName(req)).to.equal(null);
            req = mockReq(' // ');
            expect(whs._getRouteName(req)).to.equal(null);
        });

        it('returns name despite it don\'t match', () => {
            let req = mockReq('/nope');
            expect(whs._getRouteName(req)).to.equal('nope');
            req = mockReq('/nope/nope');
            expect(whs._getRouteName(req)).to.equal('nope');
        });

        it('returns the match if matched', () => {
            let req = mockReq('/demo');
            expect(whs._getRouteName(req)).to.equal('demo');
            req = mockReq('/demo?asd=2');
            expect(whs._getRouteName(req)).to.equal('demo');
        });
    });
});

// function mockGithub() {
//     return {
//         ref: "refs/heads/changes",
//         before: "9049f1265b7d61be4a8904a9a27120d2064dab3b",
//         after: "0d1a26e67d8f5eaf1f6ba5c57fc3c7d91ac0fd1c",
//         created: false,
//         deleted: false,
//         forced: false,
//         base_ref: null,
//         compare: "https://github.com/baxterthehacker/public-repo/compare/9049f1265b7d...0d1a26e67d8f",
//         commits: [
//             {
//                 id: "0d1a26e67d8f5eaf1f6ba5c57fc3c7d91ac0fd1c",
//                 tree_id: "f9d2a07e9488b91af2641b26b9407fe22a451433",
//                 distinct: true,
//                 message: "Update README.md",
//                 timestamp: "2015-05-05T19:40:15-04:00",
//                 url: "https://github.com/baxterthehacker/public-repo/commit/0d1a26e67d8f5eaf1f6ba5c57fc3c7d91ac0fd1c",
//                 author: {
//                     name: "baxterthehacker",
//                     email: "baxterthehacker@users.noreply.github.com",
//                     username: "baxterthehacker"
//                 },
//                 committer: {
//                     name: "baxterthehacker",
//                     email: "baxterthehacker@users.noreply.github.com",
//                     username: "baxterthehacker"
//                 },
//                 added: [
//
//                 ],
//                 removed: [
//
//                 ],
//                 modified: [
//                     "README.md"
//                 ]
//             }
//         ],
//         head_commit: {
//             id: "0d1a26e67d8f5eaf1f6ba5c57fc3c7d91ac0fd1c",
//             tree_id: "f9d2a07e9488b91af2641b26b9407fe22a451433",
//             distinct: true,
//             message: "Update README.md",
//             timestamp: "2015-05-05T19:40:15-04:00",
//             url: "https://github.com/baxterthehacker/public-repo/commit/0d1a26e67d8f5eaf1f6ba5c57fc3c7d91ac0fd1c",
//             author: {
//                 name: "baxterthehacker",
//                 email: "baxterthehacker@users.noreply.github.com",
//                 username: "baxterthehacker"
//             },
//             committer: {
//                 name: "baxterthehacker",
//                 email: "baxterthehacker@users.noreply.github.com",
//                 username: "baxterthehacker"
//             },
//             added: [
//
//             ],
//             removed: [
//
//             ],
//             modified: [
//                 "README.md"
//             ]
//         },
//         repository: {
//             id: 35129377,
//             name: "public-repo",
//             full_name: "baxterthehacker/public-repo",
//             owner: {
//                 name: "baxterthehacker",
//                 email: "baxterthehacker@users.noreply.github.com"
//             },
//             private: false,
//             html_url: "https://github.com/baxterthehacker/public-repo",
//             description: "",
//             fork: false,
//             url: "https://github.com/baxterthehacker/public-repo",
//             forks_url: "https://api.github.com/repos/baxterthehacker/public-repo/forks",
//             keys_url: "https://api.github.com/repos/baxterthehacker/public-repo/keys{/key_id}",
//             collaborators_url: "https://api.github.com/repos/baxterthehacker/public-repo/collaborators{/collaborator}",
//             teams_url: "https://api.github.com/repos/baxterthehacker/public-repo/teams",
//             hooks_url: "https://api.github.com/repos/baxterthehacker/public-repo/hooks",
//             issue_events_url: "https://api.github.com/repos/baxterthehacker/public-repo/issues/events{/number}",
//             events_url: "https://api.github.com/repos/baxterthehacker/public-repo/events",
//             assignees_url: "https://api.github.com/repos/baxterthehacker/public-repo/assignees{/user}",
//             branches_url: "https://api.github.com/repos/baxterthehacker/public-repo/branches{/branch}",
//             tags_url: "https://api.github.com/repos/baxterthehacker/public-repo/tags",
//             blobs_url: "https://api.github.com/repos/baxterthehacker/public-repo/git/blobs{/sha}",
//             git_tags_url: "https://api.github.com/repos/baxterthehacker/public-repo/git/tags{/sha}",
//             git_refs_url: "https://api.github.com/repos/baxterthehacker/public-repo/git/refs{/sha}",
//             trees_url: "https://api.github.com/repos/baxterthehacker/public-repo/git/trees{/sha}",
//             statuses_url: "https://api.github.com/repos/baxterthehacker/public-repo/statuses/{sha}",
//             languages_url: "https://api.github.com/repos/baxterthehacker/public-repo/languages",
//             stargazers_url: "https://api.github.com/repos/baxterthehacker/public-repo/stargazers",
//             contributors_url: "https://api.github.com/repos/baxterthehacker/public-repo/contributors",
//             subscribers_url: "https://api.github.com/repos/baxterthehacker/public-repo/subscribers",
//             subscription_url: "https://api.github.com/repos/baxterthehacker/public-repo/subscription",
//             commits_url: "https://api.github.com/repos/baxterthehacker/public-repo/commits{/sha}",
//             git_commits_url: "https://api.github.com/repos/baxterthehacker/public-repo/git/commits{/sha}",
//             comments_url: "https://api.github.com/repos/baxterthehacker/public-repo/comments{/number}",
//             issue_comment_url: "https://api.github.com/repos/baxterthehacker/public-repo/issues/comments{/number}",
//             contents_url: "https://api.github.com/repos/baxterthehacker/public-repo/contents/{+path}",
//             compare_url: "https://api.github.com/repos/baxterthehacker/public-repo/compare/{base}...{head}",
//             merges_url: "https://api.github.com/repos/baxterthehacker/public-repo/merges",
//             archive_url: "https://api.github.com/repos/baxterthehacker/public-repo/{archive_format}{/ref}",
//             downloads_url: "https://api.github.com/repos/baxterthehacker/public-repo/downloads",
//             issues_url: "https://api.github.com/repos/baxterthehacker/public-repo/issues{/number}",
//             pulls_url: "https://api.github.com/repos/baxterthehacker/public-repo/pulls{/number}",
//             milestones_url: "https://api.github.com/repos/baxterthehacker/public-repo/milestones{/number}",
//             notifications_url: "https://api.github.com/repos/baxterthehacker/public-repo/notifications" +
//             "{?since,all,participating}",
//             labels_url: "https://api.github.com/repos/baxterthehacker/public-repo/labels{/name}",
//             releases_url: "https://api.github.com/repos/baxterthehacker/public-repo/releases{/id}",
//             created_at: 1430869212,
//             updated_at: "2015-05-05T23:40:12Z",
//             pushed_at: 1430869217,
//             git_url: "git://github.com/baxterthehacker/public-repo.git",
//             ssh_url: "git@github.com:baxterthehacker/public-repo.git",
//             clone_url: "https://github.com/baxterthehacker/public-repo.git",
//             svn_url: "https://github.com/baxterthehacker/public-repo",
//             homepage: null,
//             size: 0,
//             stargazers_logs: 0,
//             watchers_logs: 0,
//             language: null,
//             has_issues: true,
//             has_downloads: true,
//             has_wiki: true,
//             has_pages: true,
//             forks_logs: 0,
//             mirror_url: null,
//             open_issues_logs: 0,
//             forks: 0,
//             open_issues: 0,
//             watchers: 0,
//             default_branch: "master",
//             stargazers: 0,
//             master_branch: "master"
//         },
//         pusher: {
//             name: "baxterthehacker",
//             email: "baxterthehacker@users.noreply.github.com"
//         },
//         sender: {
//             login: "baxterthehacker",
//             id: 6752317,
//             avatar_url: "https://avatars.githubusercontent.com/u/6752317?v=3",
//             gravatar_id: "",
//             url: "https://api.github.com/users/baxterthehacker",
//             html_url: "https://github.com/baxterthehacker",
//             followers_url: "https://api.github.com/users/baxterthehacker/followers",
//             following_url: "https://api.github.com/users/baxterthehacker/following{/other_user}",
//             gists_url: "https://api.github.com/users/baxterthehacker/gists{/gist_id}",
//             starred_url: "https://api.github.com/users/baxterthehacker/starred{/owner}{/repo}",
//             subscriptions_url: "https://api.github.com/users/baxterthehacker/subscriptions",
//             organizations_url: "https://api.github.com/users/baxterthehacker/orgs",
//             repos_url: "https://api.github.com/users/baxterthehacker/repos",
//             events_url: "https://api.github.com/users/baxterthehacker/events{/privacy}",
//             received_events_url: "https://api.github.com/users/baxterthehacker/received_events",
//             type: "User",
//             site_admin: false
//         }
//     };
// }
