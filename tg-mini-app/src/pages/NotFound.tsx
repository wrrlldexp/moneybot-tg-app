import { useNavigate } from "react-router-dom";

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center h-64 text-center">
      <div className="space-y-3">
        <p className="text-4xl font-bold text-tg-hint">404</p>
        <p className="text-sm text-tg-hint">Страница не найдена</p>
        <button
          onClick={() => navigate("/")}
          className="px-5 py-2 rounded-xl bg-tg-button text-tg-button-text text-sm font-medium"
        >
          На главную
        </button>
      </div>
    </div>
  );
}
