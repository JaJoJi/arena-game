# Hosting both versions

Each version is **one Docker image** that contains both the game server and the web page (the server serves the
built client). Two versions = two images = two containers.

| Version | Git branch | Image | Port |
|---|---|---|---|
| Grid (shaped blocks on a grid, connect bonuses) | `phase1-combat-character` | `arena-grid` | 8787 |
| List (vertical skill list, skill tree) | `skill-list` | `arena-list` | 8788 |

## 1. Build the images (on the machine that has the repo)

```bash
git checkout phase1-combat-character
docker build -t arena-grid .

git checkout skill-list
docker build -t arena-list .
```

## 2a. Run on the same machine

```bash
docker compose -f deploy/docker-compose.yml up -d
```

Open `http://<server-ip>:8787` (grid) and `http://<server-ip>:8788` (list). Open those ports in the firewall.

## 2b. Or copy the images to another server

```bash
docker save arena-grid arena-list -o arena-images.tar     # on the build machine
# copy arena-images.tar and deploy/docker-compose.yml to the server, then on the server:
docker load -i arena-images.tar
docker compose -f docker-compose.yml up -d
```

## Notes

- Saved builds, fights and replays live in the volumes `arena-grid-data` and `arena-list-data`, so they survive
  restarts and updates. To wipe a version's data: `docker compose down`, then `docker volume rm deploy_arena-list-data`
  (the volume name has the compose project's prefix; check with `docker volume ls`).
- Players' runs are saved in their own browser, separately per site (port), so the two versions don't mix.
- Update a version: rebuild its image, then `docker compose -f deploy/docker-compose.yml up -d` again.
- Logs: `docker logs -f arena-list`. Health: each container checks itself every 30 s (`docker ps` shows "healthy").
- Plain HTTP only. For a public site put a reverse proxy with HTTPS (e.g. Caddy or nginx) in front, and keep the
  game ports closed to the internet if you do.
