import { setupAPIClient } from "../services/api";
import { withSSRAuth } from "../utils/withSSRAuth";

export default function Metrics() {
  return (
    <>
      <p>Métricas</p>
    </>
  );
}

export const getServerSideProps = withSSRAuth(
  async (context) => {
    const apiClient = setupAPIClient(context);
    const response = await apiClient.get("/me");

    return {
      props: {},
    };
  },
  {
    permissions: ["metrics.list"],
    roles: ["administrator"],
  }
);
