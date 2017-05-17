'use strict';

import Generator from 'yeoman-generator';
import chalk from 'chalk';
import yosay from 'yosay';
import forEach from 'lodash/forEach';
import assign from 'lodash/assign';
import gitConfig from 'git-config';
import glob from 'glob';

let licenses = [
  {
    name: 'Apache 2.0',
    value: 'Apache-2.0'
  }, {
    name: 'MIT',
    value: 'MIT'
  }, {
    name: 'Mozilla Public License 2.0',
    value: 'MPL-2.0'
  }, {
    name: 'BSD 2-Clause (FreeBSD) License',
    value: 'BSD-2-Clause-FreeBSD'
  }, {
    name: 'BSD 3-Clause (NewBSD) License',
    value: 'BSD-3-Clause'
  }, {
    name: 'Internet Systems Consortium (ISC) License',
    value: 'ISC'
  }, {
    name: 'GNU AGPL 3.0',
    value: 'AGPL-3.0'
  }, {
    name: 'GNU GPL 3.0',
    value: 'GPL-3.0'
  }, {
    name: 'GNU LGPL 3.0',
    value: 'LGPL-3.0'
  }, {
    name: 'Unlicense',
    value: 'unlicense'
  }, {
    name: 'No License (Copyrighted)',
    value: 'nolicense'
  }
];

class NodeFullstack extends Generator {
  constructor(args, opts) {
    super(args, opts);

    this.argument('appname', {
      type: String,
      required: false
    });

    this.option('name', {
      type: String,
      desc: '许可证拥有者',
      required: false
    });

    this.option('email', {
      type: String,
      desc: '许可证拥有者的电子邮箱',
      required: false
    });

    this.option('website', {
      type: String,
      desc: '许可证拥有者的网站',
      required: false
    });

    this.option('year', {
      type: String,
      desc: '许可证有效年限',
      required: false,
      defaults: (new Date()).getFullYear()
    });

    this.option('licensePrompt', {
      type: String,
      desc: '许可证提示',
      defaults: '你想要使用哪种许可证？',
      hide: true,
      required: false
    });

    this.option('defaultLicense', {
      type: String,
      desc: '默认许可证',
      required: false
    });

    this.option('license', {
      type: String,
      desc: '选择一个许可证后就不会再有类似提示了',
      required: false
    });

    this.option('output', {
      type: String,
      desc: '为即将生成的许可证设置输出文件（名，包括后缀）',
      required: false,
      defaults: 'LICENSE'
    });
  }
  initializing() {
    this.props = {};
    this.gitc = gitConfig.sync();
    this.gitc.user = this.gitc.user || {};
  }
  prompting() {
    let generator = chalk.red('Node 全栈');
    this.log(yosay(`欢迎使用 ${generator} 生成器`));

    // TODO: 新功能，输入目前确认的开发者信息，用于填充 `.mailmap`、`package.json` 等文件
    // TODO: 新功能，设定不同环境下服务器、数据库等配置
    // TODO: 修复，生成的 `doc/deployment.md` 文件内密码字样出现转义现象
    const prompts = [{
      type: 'input',
      name: 'iptProjectName',
      message: '输入项目名称',
      required: true,
      default: this.options.appname || this.appname
    }, {
      type: 'input',
      name: 'iptProjectDescription',
      message: '输入项目描述',
      required: true,
      default: '这是一个面向前端工程师的 Node 全栈工程。'
    }, {
      type: 'input',
      name: 'iptRedisPassword',
      message: '设置 redis 数据库的访问密码',
      default: 'cnDaNdAn!@#$&13679'
    }, {
      name: 'name',
      message: '你的姓名',
      default: this.options.name || this.gitc.user.name,
      when: this.options.name === null || this.options.name === undefined
    }, {
      name: 'email',
      message: '你的电子邮箱 (可选):',
      default: this.options.email || this.gitc.user.email,
      when: !this.options.email
    }, {
      name: 'website',
      message: '你的网站 (可选):',
      default: this.options.website,
      when: !this.options.website
    }, {
      type: 'list',
      name: 'license',
      message: this.options.licensePrompt,
      default: this.options.defaultLicense,
      when: !this.options.license ||
              licenses.find(x => x.value === this.options.license) === undefined,
      choices: licenses
    }];

    return this.prompt(prompts).then(props => {
      this.props = assign({
        name: this.options.name,
        email: this.options.email,
        website: this.options.website,
        license: this.options.license,
        year: this.options.license
      }, props);
    });
  }

  writing() {
    this._copyTpl();

    this._copy();
  }

  _copyTpl() {
    let filename = this.props.license + '.txt';
    let author = this.props.name.trim();
    if (this.props.email) {
      author += ' <' + this.props.email.trim() + '>';
    }
    if (this.props.website) {
      author += ' (' + this.props.website.trim() + ')';
    }

    let passed = {
      redisPassword: this.props.iptRedisPassword,
      projectDescription: this.props.iptProjectDescription,
      projectName: this.props.iptProjectName,
      year: this.options.year,
      author: author
    };

    let _path = 'license/' + filename;

    this.fs.copyTpl(
      this.templatePath(_path),
      this.destinationPath(this.options.output),
      passed
    );

    this.fs.copyTpl(
      glob.sync(this.templatePath('./*'), {dot: true, nodir: true}),
      this.destinationPath(),
      passed
    );

    this.fs.copyTpl(
      this.templatePath('doc'),
      this.destinationPath('doc'),
      passed
    );

    if (!this.fs.exists(this.destinationPath('package.json'))) {
      return;
    }

    let pkg = this.fs.readJSON(this.destinationPath('package.json'), {});
    pkg.license = this.props.license;

    // We don't want users to publish their module to NPM if they copyrighted
    // their content.
    if (this.props.license === 'nolicense') {
      delete pkg.license;
      pkg.private = true;
    }

    this.fs.writeJSON(this.destinationPath('package.json'), pkg);
  }

  _copy() {
    let _self = this;
    let dirsToCopy = [
      '.atom',
      '.gitlab',
      '.sublimetext',
      '.vscode',
      'flow-typed',
      'server',
      'test',
      'tool',
      'task',
      'client'
    ];

    forEach(dirsToCopy, item => {
      _self.fs.copy(
        _self.templatePath(item),
        _self.destinationPath(item)
      );
    });
  }

  install() {
    this.installDependencies({
      npm: false,
      bower: true,
      yarn: true
    });
  }
}

module.exports = NodeFullstack;
module.exports.licenses = licenses;
