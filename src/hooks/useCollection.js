import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";

export default function useCollection(path) {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({
    items: [],
    total: 0,
    page: 1,
    limit: 20,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    let redirected = false;
    api(`${path}?page=${page}`)
      .then((data) => {
        if (!active) return;
        const lastPage = Math.max(1, Math.ceil(data.total / data.limit));
        if (page > lastPage) {
          redirected = true;
          setPage(lastPage);
          setRevision((value) => value + 1);
          return;
        }
        setResult(data);
        setError("");
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      })
      .finally(() => {
        if (active && !redirected) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, page, revision]);

  return {
    ...result,
    loading,
    error,
    reload: () => {
      setLoading(true);
      reload();
    },
    changePage: (next) => {
      setLoading(true);
      setPage(next);
    },
  };
}
