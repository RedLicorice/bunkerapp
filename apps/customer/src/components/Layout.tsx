import { BottomNav } from './BottomNav'

interface Props {
  children: React.ReactNode
  title?: string
  action?: React.ReactNode
}

export function Layout({ children, title, action }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      {title && (
        <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 px-4 py-4 backdrop-blur safe-top">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">{title}</h1>
            {action}
          </div>
        </header>
      )}
      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-4 animate-fade-in">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
