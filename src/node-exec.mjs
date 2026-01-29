import { spawn } from'node:child_process';

const command = 'pnpm create vite react-todo-app --template react-ts';
// 获取当前工作目录
const cwd = process.cwd();
// 使用 spawn 创建子进程执行命令
const child = spawn(command, {  
  cwd, // 设置子进程的工作目录  
  stdio: 'inherit', // 实时输出到控制台（继承父进程的 stdin, stdout, stderr）  
  shell: true,
});
let errorMsg = '';

child.on('error', (error) => {
  errorMsg = error.message;
});

child.on('close', (code) => {
if (code === 0) {
    process.exit(0);
  } else {
    if (errorMsg) {
      console.error(`错误: ${errorMsg}`);
    }
    process.exit(code || 1);
  }
});