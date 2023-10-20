import asyncio
import uvicorn
from starlette.applications import Starlette
from starlette.routing import Route
from sse_starlette.sse import EventSourceResponse
from sse_starlette.sse import ServerSentEvent

async def numbers(minimum, maximum):
	for i in range(minimum, maximum + 1):
		yield dict(data=i)
		await asyncio.sleep(2)

async def sse(request):
	generator = numbers(1, 10)
	return EventSourceResponse(
		generator,
		headers={"Server": "nini"},
		ping=5,
		ping_message_factory=lambda: ServerSentEvent(**{"comment": "You can't see\r\nthis ping"}),
	)

routes = [
	Route("/", endpoint=sse)
]

app = Starlette(debug=True, routes=routes)

if __name__ == "__main__":
	uvicorn.run(app, host="0.0.0.0", port=9000, log_level='debug')