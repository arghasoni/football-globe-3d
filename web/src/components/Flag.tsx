interface Props {
  code: string
  size: number
}

export default function Flag({ code, size }: Props) {
  return (
    <img
      className="flag"
      src={`https://flagcdn.com/w80/${code}.png`}
      alt=""
      width={Math.round(size * 1.4)}
      height={size}
    />
  )
}
