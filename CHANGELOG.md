# Changelog
All notable changes to this project will be documented in this file.

## 
### Fix
- Respond to the webhook server without waiting the command to end. Fixes issues with Github Webhook timeout(10s).

## 1.1.12 - 2019-07-06
### Fix
- Hooks with secret not working as not being able to hash the raw body

## 1.1.10/11 - 2019-07-06
### Fix
- Issue with bitbucket body not being parsed correctly

### Change
- Now travis test on multiple node versions

## 1.1.9 - 2018-08-05
### Fix
- Issue with github webhook without secret, not receiving the header

## 1.1.5-8 - 2018-06-01
### Change
- Upgrade dependencies

### Fix
- Readme typo

## 1.1.4 - 2017-03-07
### Add
- Initial support for bitbucket

## 1.1.2-1.1.3 - 2017-03-04
### Add
- Initial secret support for github

## 1.1.0-1.1.1 - 2017-03-04
### Add
- CWD configuration support

## 1.0.7 - 2017-02-26
### Add
- Badges

## 1.0.6 - 2017-02-26
### Add
- Babel
- Readme

## 1.0.5 - 2017-02-26
### Add
- Log service

## 1.0.4 - 2017-02-26
### Add
- Run of a simple command

## 1.0.3 - 2017-02-26
### Add
- Index on root folder

## 1.0.2 - 2017-02-25
### Add
- Basics on Pm2Module
- More tests to WebhookServer

## 1.0.1 - 2017-02-23
### Add
- Test and lint

## 1.0.0 - 2017-02-23
### Add
- Base of the project
