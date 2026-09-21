# 0FI

Now: English | 我们还有 [中文(简体)](./README.md) 版本.

A FancyIndex theme with no dependencies.

## 🚀 Features

This is a fork of <https://github.com/Naereen/Nginx-Fancyindex-Theme>.

- A beautiful UI that stays fast and easy to use.
- Supports **light and dark themes**, including automatic switching, with no flash on load.
- Supports searching files on the page and keeping the term in the URL, and you can copy the current URL too.
- Only **3 steps** to get it running on any device that supports fancyindex and nginx.
- Very small file size.

## 🔧 How to use

If you are not using Debian GNU/Linux, or your package sources do not include the fancyindex module, try building nginx yourself with the fancyindex module added.

### ⬇️ First install

Make sure you are in the `root` directory set in your nginx configuration, and that you are running Debian GNU/Linux 12 or later.

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

### ⬆️ Update

```bash
rm -rf 0fi/
mkdir -p 0fi/
cd 0fi/
wget https://github.com/moaeiou/0fi/releases/latest/download/0fi.tar.zst
tar -xvf 0fi.tar.zst
rm 0fi.tar.zst
cd ..
```

### 📶 Nginx configuration

First, load the FancyIndex module by including the module configuration at the top of the nginx configuration:

```ini
include /etc/nginx/modules-enabled/*.conf;
```

The `location` part:

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

Once you have confirmed the configuration is correct, save it and restart nginx:

```bash
nginx -t
systemctl restart nginx
```

## ⚖️ Terms and license

This project is licensed under the [MoPL](https://867678.xyz/docs/mopl).

Original author: © 2016-17 Lilian Besson [Naereen](https://github.com/Naereen)

Original project license: [here](https://github.com/Naereen/Nginx-Fancyindex-Theme/blob/master/LICENSE)
