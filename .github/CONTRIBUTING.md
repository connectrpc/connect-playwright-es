Contributing
============

If you'd like to add new exported APIs, please [open an issue][open-issue]
describing your proposal &mdash; discussing API changes ahead of time makes
pull request review much smoother. In your issue, pull request, and any other
communications, please remember to treat your fellow contributors with
respect!

Note that you'll need to sign [Buf's Contributor License Agreement][cla]
before we can accept any of your contributions. If necessary, a bot will remind
you to accept the CLA when you open your pull request.

## Setup

[Fork][fork], then clone the repository:

```
git clone git@github.com:your_github_username/connect-es-utils.git
cd connect-es-utils
git remote add upstream https://github.com/bufbuild/connect-es-utils.git
git fetch upstream
```

Make sure that the tests and the linters pass (you'll need `node`, `bash`, and the latest stable Go release installed):

The easiest way to run all commands is to use the `all` npm script:

```
npm run all
```

## Making Changes

Start by creating a new branch for your changes:

```
git checkout main
git fetch upstream
git rebase upstream/main
git checkout -b cool_new_feature
```

Make your changes, then ensure that `npm run all` still passes.
When you're satisfied with your changes, push them to your fork.

```
git commit -a
git push origin cool_new_feature
```

Then use the GitHub UI to open a pull request.

At this point, you're waiting on us to review your changes. We *try* to respond
to issues and pull requests within a few business days, and we may suggest some
improvements or alternatives. Once your changes are approved, one of the
project maintainers will merge them.

We're much more likely to approve your changes if you:

* Add tests for new functionality.
* Write a [good commit message][commit-message].
* Maintain backward compatibility.

[fork]: https://github.com/bufbuild/connect-es-utils/fork
[open-issue]: https://github.com/bufbuild/connect-es-utils/issues/new
[cla]: https://cla-assistant.io/bufbuild/connect-es-utils
[commit-message]: http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html
