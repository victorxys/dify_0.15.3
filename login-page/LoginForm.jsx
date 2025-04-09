window.LoginForm = () => {
  const [formData, setFormData] = React.useState({
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // 这里添加登录逻辑
    console.log('登录信息：', formData);
  };

  return (
    <div className="login-form-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>用户登录</h2>
        <div className="form-group">
          <input
            type="text"
            name="username"
            placeholder="用户名"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            name="password"
            placeholder="密码"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit" className="login-button">
          登录
        </button>
        <div className="form-footer">
          <a href="#" className="forgot-password">忘记密码？</a>
          <a href="#" className="register">注册账号</a>
        </div>
      </form>
    </div>
  );
};
