import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  // 内核服务仅内网暴露（nginx 反代 8092 → 8093）
  const port = Number(process.env.API_PORT ?? 8093)
  await app.listen(port, '127.0.0.1')
  console.log(`[cyberswat-dev-api] kernel listening on http://127.0.0.1:${port}/api`)
}

bootstrap()
