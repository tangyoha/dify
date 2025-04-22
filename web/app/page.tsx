import Link from 'next/link'
import Loading from '@/app/components/base/loading'

const Home = async () => {
  // 使用环境变量获取要嵌入的URL，如果不存在则使用默认值
  const embedUrl = process.env.NEXT_PUBLIC_EMBED_URL || 'http://localhost:3001'
  
  return (
    <div className="flex min-h-screen flex-col">
      {/* 通过iframe嵌入其他项目 - 从环境变量获取URL */}
      <iframe 
        src={embedUrl} 
        className="w-full h-screen border-0"
        style={{ height: '100vh' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

export default Home
