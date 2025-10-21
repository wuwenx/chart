// 测试代码文件 - 智能问答系统示例
// 这个文件用于测试代码分析功能

/**
 * 用户管理类
 * 提供用户注册、登录、信息更新等功能
 */
class UserManager {
  constructor() {
    this.users = new Map();
    this.currentUser = null;
  }

  /**
   * 用户注册
   * @param {string} username - 用户名
   * @param {string} email - 邮箱
   * @param {string} password - 密码
   * @returns {boolean} 注册是否成功
   */
  register(username, email, password) {
    // 验证输入参数
    if (!username || !email || !password) {
      throw new Error('用户名、邮箱和密码不能为空');
    }

    // 检查用户是否已存在
    if (this.users.has(username)) {
      throw new Error('用户名已存在');
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('邮箱格式不正确');
    }

    // 密码强度检查
    if (password.length < 8) {
      throw new Error('密码长度至少8位');
    }

    // 创建用户对象
    const user = {
      username,
      email,
      password: this.hashPassword(password),
      createdAt: new Date(),
      isActive: true
    };

    // 存储用户信息
    this.users.set(username, user);
    
    console.log(`用户 ${username} 注册成功`);
    return true;
  }

  /**
   * 用户登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {boolean} 登录是否成功
   */
  login(username, password) {
    const user = this.users.get(username);
    
    if (!user) {
      throw new Error('用户不存在');
    }

    if (!user.isActive) {
      throw new Error('用户账户已被禁用');
    }

    if (user.password !== this.hashPassword(password)) {
      throw new Error('密码错误');
    }

    this.currentUser = user;
    console.log(`用户 ${username} 登录成功`);
    return true;
  }

  /**
   * 更新用户信息
   * @param {string} username - 用户名
   * @param {Object} updates - 要更新的字段
   * @returns {boolean} 更新是否成功
   */
  updateUser(username, updates) {
    const user = this.users.get(username);
    
    if (!user) {
      throw new Error('用户不存在');
    }

    // 允许更新的字段
    const allowedFields = ['email', 'isActive'];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        user[key] = value;
      }
    }

    user.updatedAt = new Date();
    this.users.set(username, user);
    
    console.log(`用户 ${username} 信息更新成功`);
    return true;
  }

  /**
   * 获取用户信息
   * @param {string} username - 用户名
   * @returns {Object|null} 用户信息
   */
  getUser(username) {
    const user = this.users.get(username);
    
    if (!user) {
      return null;
    }

    // 返回用户信息（不包含密码）
    return {
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isActive: user.isActive
    };
  }

  /**
   * 密码哈希处理
   * @param {string} password - 原始密码
   * @returns {string} 哈希后的密码
   */
  hashPassword(password) {
    // 简单的哈希实现（实际应用中应使用更安全的方法）
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString();
  }

  /**
   * 获取所有用户列表
   * @returns {Array} 用户列表
   */
  getAllUsers() {
    const userList = [];
    
    for (const [username, user] of this.users) {
      userList.push(this.getUser(username));
    }
    
    return userList;
  }

  /**
   * 删除用户
   * @param {string} username - 用户名
   * @returns {boolean} 删除是否成功
   */
  deleteUser(username) {
    if (!this.users.has(username)) {
      throw new Error('用户不存在');
    }

    this.users.delete(username);
    
    // 如果删除的是当前登录用户，清除登录状态
    if (this.currentUser && this.currentUser.username === username) {
      this.currentUser = null;
    }
    
    console.log(`用户 ${username} 删除成功`);
    return true;
  }

  /**
   * 用户登出
   */
  logout() {
    if (this.currentUser) {
      console.log(`用户 ${this.currentUser.username} 登出成功`);
      this.currentUser = null;
    }
  }

  /**
   * 获取当前登录用户
   * @returns {Object|null} 当前用户信息
   */
  getCurrentUser() {
    return this.currentUser ? this.getUser(this.currentUser.username) : null;
  }
}

// 使用示例
const userManager = new UserManager();

try {
  // 注册用户
  userManager.register('alice', 'alice@example.com', 'password123');
  userManager.register('bob', 'bob@example.com', 'mypassword456');
  
  // 用户登录
  userManager.login('alice', 'password123');
  
  // 获取当前用户信息
  console.log('当前用户:', userManager.getCurrentUser());
  
  // 更新用户信息
  userManager.updateUser('alice', { email: 'alice.new@example.com' });
  
  // 获取所有用户
  console.log('所有用户:', userManager.getAllUsers());
  
  // 用户登出
  userManager.logout();
  
} catch (error) {
  console.error('操作失败:', error.message);
}

module.exports = UserManager;
