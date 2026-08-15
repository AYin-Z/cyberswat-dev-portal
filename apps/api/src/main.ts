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
  // 容器内绑定 0.0.0.0（nginx 从 docker 网络反代；公网不暴露该端口）
  const port = Number(process.env.API_PORT ?? 8093)
  await app.listen(port, process.env.API_HOST ?? '0.0.0.0')
  console.log(`[cyberswat-dev-api] kernel listening on http://${process.env.API_HOST ?? '0.0.0.0'}:${port}/api`)
}

bootstrap()
