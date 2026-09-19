# 0FI

现在是: **中文简体** | We aslo have : [English](README.en.md) 

没有依赖的FancyIndex-Theme

## 🚀 特性

这是[Naereen/Nginx-Fancyindex-Theme](https://github.com/Naereen/Nginx-Fancyindex-Theme)的分支

- 具备一个漂亮的UI同时兼顾快速和易用.
- 支持**黑白主题切换**,同时具备自动切换.没有打开时闪烁.
- 支持页中搜索文件并保持URL,您还可以复制当前的URL.
- 只需**3步**即可在任何支持fancyindex和nginx的设备上运行此项目.
- 文件体积十分微小.

## 🔧 如何使用

如果你没有使用Debian GNU/Linux 或者您的软件源中不包含fancyindex模块,请尝试自行编译并加入fancyindex模块.

### ⬇️ 首次安装

确保您在nginx配置文件中设置的`root`目录并且使用Debian GNU/Linux 12或更高版本.

```bash
apt update
apt install -y wget nginx libnginx-mod-http-fancyindex
rm -rf 0fi/ || exit 0
mkdir -p 0fi/
cd 0fi/
wget https://github.com/moaeiou/0fi/releases/latest/download/0fi.tar.zst
tar -xvf 0fi.tar.zst
rm 0fi.tar.zst
cd ..
```

### ⬆️ 更新

```bash
rm -rf 0fi/
mkdir -p 0fi/
cd 0fi/
wget https://github.com/moaeiou/0fi/releases/latest/download/0fi.tar.zst
tar -xvf 0fi.tar.zst
rm 0fi.tar.zst
cd ..
```

### 📶 对于Nginx配置

先在Nginx的头部引入FancyIndex-Theme

```ini
include /etc/nginx/modules-enabled/*.conf;
```

`location` 部分

```ini
location ^~ / {
    alias /var/www/html/;
    include mime.types;
    default_type application/octet-stream;
    fancyindex on;
    fancyindex_localtime on;
    fancyindex_show_path off;
    fancyindex_exact_size off;
    fancyindex_header "/0fi/header.html";
    fancyindex_footer "/0fi/footer.html";
    fancyindex_ignore "0fi";
}
```

确认配置无误后,保存并重启Nginx

```bash
nginx -t
systemctl restart nginx
```

## ⚖️ 条款与授权

这个项目以[MoPL](https://867678.xyz/docs/mopl)协议授权.

原项目作者: © 2016-17 Lilian Besson [Naereen](https://github.com/Naereen)

原项目版权信息: [这里](https://github.com/Naereen/Nginx-Fancyindex-Theme/blob/master/LICENSE)
