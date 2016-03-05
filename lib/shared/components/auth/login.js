'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

const React = require(`react`);

module.exports = function (_React$Component) {
  _inherits(Login, _React$Component);

  function Login() {
    _classCallCheck(this, Login);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Login).apply(this, arguments));
  }

  _createClass(Login, [{
    key: "facebookLogin",
    value: function facebookLogin() {
      window.location.href = `auth/facebook`;
    }
  }, {
    key: "render",
    value: function render() {
      return React.createElement(
        "div",
        { className: "login-container" },
        React.createElement(
          "div",
          { className: "login-container__header" },
          "Sign In"
        ),
        React.createElement(
          "form",
          { className: "signin-form" },
          React.createElement("input", { className: "signin-form__username", name: "username", placeholder: "Username" }),
          React.createElement("input", { className: "signin-form__password", name: "password", type: "password", placeholder: "Password" }),
          React.createElement("input", { className: "signin-form__submit-button", type: "submit" })
        ),
        React.createElement(
          "div",
          { className: "button-container" },
          React.createElement(
            "button",
            { className: "button-container__submit-button", onClick: this.facebookLogin },
            "Login with Facebook"
          )
        ),
        React.createElement(
          "div",
          { className: "button-container" },
          React.createElement(
            "div",
            { className: "button-container__open-register", onClick: () => this.props.switchToRegister() },
            "Create an account"
          )
        )
      );
    }
  }]);

  return Login;
}(React.Component);