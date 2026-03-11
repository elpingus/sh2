Local HTTPS for `steamhoursnet.xyz`

1. Install `mkcert`
2. Run:

```powershell
mkcert -install
mkcert -key-file "C:\Users\arash\Desktop\hourboıst\deploy\certs\steamhoursnet.xyz-key.pem" -cert-file "C:\Users\arash\Desktop\hourboıst\deploy\certs\steamhoursnet.xyz.pem" steamhoursnet.xyz www.steamhoursnet.xyz
```

3. Restart local preview:

```powershell
C:\Users\arash\Desktop\hourboıst\deploy\stop-local-domain.cmd
C:\Users\arash\Desktop\hourboıst\deploy\start-local-domain.cmd
```

4. Open:

```text
https://steamhoursnet.xyz
```
