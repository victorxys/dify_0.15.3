window.App = () => {
  return (
    <div className="app">
      <LoginForm />
    </div>
  );
};

// 渲染应用
ReactDOM.render(
  <App />,
  document.getElementById('root')
);
